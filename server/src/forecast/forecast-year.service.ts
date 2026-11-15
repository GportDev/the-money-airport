import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { forecastCell, forecastRow } from "../db/schema/forecast";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import { SettingsService } from "../settings/settings.service";
import { countedInDebtRowIds } from "./counted-in-debt";
import { monthEndOf, monthKey, todayIso } from "./dates";
import type { ForecastRowFull, ForecastSectionDto, ForecastSectionFull } from "./forecast.types";
import { ForecastSectionsService } from "./forecast-sections.service";
import { OneOffsService } from "./one-offs.service";
import { type ActualsByRow, recurringActuals } from "./recurring-actuals";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const isTransfer = sql<boolean>`${transaction.tags} && array['transfer','savings_transfer']::text[]`;

/** Category id → month → net Base cents; transfers kept apart for savings rows. */
type ActualsByCategory = Map<string, Map<number, { net: number; transferNet: number }>>;

/** What a row needs beyond its own Plan to build its cells. */
type RowContext = {
	pastMonths: number[];
	byCategory: ActualsByCategory;
	byRecurring: ActualsByRow;
	countedInDebt: Set<string>;
};

@Injectable()
export class ForecastYearService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly sections: ForecastSectionsService,
		private readonly oneOffs: OneOffsService,
		private readonly settings: SettingsService,
		private readonly fx: FxService,
	) {}

	async sectionsFor(userId: string, year: number): Promise<ForecastSectionFull[]> {
		const sections = await this.sections.list(userId);
		const rows = await this.db
			.select()
			.from(forecastRow)
			.where(eq(forecastRow.userId, userId))
			.orderBy(asc(forecastRow.sortOrder), asc(forecastRow.createdAt));
		const plans = await this.plans(
			rows.map((row) => row.id),
			year,
		);
		const thisMonth = todayIso().slice(0, 7);
		const pastMonths = MONTHS.filter((month) => monthKey(year, month) < thisMonth);
		const context: RowContext = {
			pastMonths,
			byCategory: await this.actuals(userId, year, pastMonths),
			byRecurring: await this.recurringActuals(userId, year, pastMonths),
			countedInDebt: await countedInDebtRowIds(this.db, userId),
		};
		const oneOffs = await this.oneOffs.list(userId, year);

		return sections.map((section) => {
			const sectionRows = rows
				.filter((row) => row.sectionId === section.id)
				.map((row) => fullRow(row, plans.get(row.id), section, context));
			return {
				...section,
				rows: sectionRows,
				oneOffs: oneOffs.filter((oneOff) => oneOff.sectionId === section.id),
				totals: totalsOf(sectionRows),
			};
		});
	}

	private async plans(rowIds: string[], year: number) {
		const plans = new Map<string, Map<number, number>>();
		if (rowIds.length === 0) return plans;
		const cells = await this.db
			.select()
			.from(forecastCell)
			.where(and(inArray(forecastCell.forecastRowId, rowIds), eq(forecastCell.year, year)));
		for (const cell of cells) {
			const byMonth = plans.get(cell.forecastRowId) ?? new Map<number, number>();
			byMonth.set(cell.month, cell.amount);
			plans.set(cell.forecastRowId, byMonth);
		}
		return plans;
	}

	private async recurringActuals(userId: string, year: number, pastMonths: number[]) {
		const lastMonth = pastMonths.at(-1);
		if (!lastMonth) return new Map() as ActualsByRow;
		const base = (await this.settings.get(userId)).currency;
		return recurringActuals(this.db, this.fx, { userId, year, lastMonth, base });
	}

	/** Net Money per Category per past month in Base, each month at its month-end rate. */
	private async actuals(
		userId: string,
		year: number,
		pastMonths: number[],
	): Promise<ActualsByCategory> {
		const actuals: ActualsByCategory = new Map();
		const last = pastMonths.at(-1);
		if (!last) return actuals;
		const base = (await this.settings.get(userId)).currency;
		const month = sql<number>`extract(month from ${transaction.date})::int`;
		const rows = await this.db
			.select({
				categoryId: transaction.categoryId,
				month,
				currency: transaction.isoCurrencyCode,
				isTransfer,
				amount: sql<string>`sum(${transaction.amount})`,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, `${year}-01-01`),
					lte(transaction.date, monthEndOf(year, last)),
				),
			)
			.groupBy(transaction.categoryId, month, transaction.isoCurrencyCode, isTransfer);

		for (const row of rows) {
			const rate =
				(await this.fx.rateFor(row.currency, base, monthEndOf(year, row.month))) ??
				(await this.fx.rateFor(row.currency, base));
			if (rate === null) continue;
			const byMonth = actuals.get(row.categoryId) ?? new Map();
			const entry = byMonth.get(row.month) ?? { net: 0, transferNet: 0 };
			const amount = Math.round(Number(row.amount) * rate);
			if (row.isTransfer) entry.transferNet += amount;
			else entry.net += amount;
			byMonth.set(row.month, entry);
			actuals.set(row.categoryId, byMonth);
		}
		return actuals;
	}
}

function fullRow(
	row: typeof forecastRow.$inferSelect,
	plan: Map<number, number> | undefined,
	section: ForecastSectionDto,
	context: RowContext,
): ForecastRowFull {
	const sparkline = MONTHS.map((month) => plan?.get(month) ?? 0);
	const cells: ForecastRowFull["cells"] = {};
	for (const month of MONTHS) {
		cells[month] = {
			plan: sparkline[month - 1] ?? 0,
			actual: context.pastMonths.includes(month) ? rowActual(row, section, context, month) : null,
		};
	}
	return {
		id: row.id,
		sectionId: row.sectionId,
		name: row.name,
		dayOfMonth: row.dayOfMonth,
		categoryId: row.categoryId,
		recurringItemId: row.recurringItemId,
		bankAccountId: row.bankAccountId,
		goalId: row.goalId,
		sortOrder: row.sortOrder,
		countedInDebt: context.countedInDebt.has(row.id),
		typicalMonthly: typicalOf(sparkline),
		sparkline,
		cells,
	};
}

/** PRD F12.9: the RecurringItem's merchant wins over the Category; neither means no Actual. */
function rowActual(
	row: typeof forecastRow.$inferSelect,
	section: ForecastSectionDto,
	context: RowContext,
	month: number,
) {
	if (row.recurringItemId) {
		const net = context.byRecurring.get(row.id)?.get(month) ?? 0;
		return section.type === "revenue" ? Math.max(0, net) : Math.max(0, -net);
	}
	if (!row.categoryId) return null;
	return actualFor(section, context.byCategory.get(row.categoryId), month);
}

/**
 * Revenue reads income; expenses read spend; savings read money moved out (Transfers included,
 * since a deposit to savings is one). A Category that netted the other way reads as 0.
 */
function actualFor(
	section: ForecastSectionDto,
	byMonth: Map<number, { net: number; transferNet: number }> | undefined,
	month: number,
) {
	const entry = byMonth?.get(month);
	if (!entry) return 0;
	if (section.type === "revenue") return Math.max(0, entry.net);
	const spent = section.type === "savings" ? entry.net + entry.transferNet : entry.net;
	return Math.max(0, -spent);
}

/** The most common non-zero Plan amount; ties go to the larger. */
function typicalOf(amounts: number[]) {
	const counts = new Map<number, number>();
	for (const amount of amounts) {
		if (amount !== 0) counts.set(amount, (counts.get(amount) ?? 0) + 1);
	}
	let typical = 0;
	let best = 0;
	for (const [amount, count] of counts) {
		if (count > best || (count === best && amount > typical)) {
			typical = amount;
			best = count;
		}
	}
	return typical;
}

function totalsOf(rows: ForecastRowFull[]) {
	const totals: Record<number, number> = {};
	for (const month of MONTHS) {
		totals[month] = rows
			.filter((row) => !row.countedInDebt)
			.reduce((sum, row) => sum + (row.cells[month]?.plan ?? 0), 0);
	}
	return totals;
}
