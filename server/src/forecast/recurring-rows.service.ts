import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { forecastCell, forecastRow } from "../db/schema/forecast";
import { recurringItem } from "../db/schema/recurring-item";
import { FxService } from "../fx/fx.service";
import type { Cadence } from "../recurring/recurring.types";
import { addMonths } from "../recurring/schedule";
import { SettingsService } from "../settings/settings.service";
import { addDays } from "./dates";
import type { ForecastRowDto } from "./forecast.types";
import { sectionTypeFor, toDto } from "./forecast-rows.service";
import { ForecastSectionsService } from "./forecast-sections.service";

type ItemRow = typeof recurringItem.$inferSelect;

/** Rows can only be paid from these; other BankAccounts leave the row on Operating cash. */
const PAYABLE_GROUPS = new Set(["cash", "credit"]);
const WEEK_DAYS = 7;

@Injectable()
export class RecurringRowsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly sections: ForecastSectionsService,
		private readonly categories: CategoriesService,
		private readonly settings: SettingsService,
		private readonly fx: FxService,
	) {}

	/**
	 * One-shot seed (PRD F12.10): one row per active RecurringItem not yet on the plan, with
	 * `year`'s Plan amounts filled from its cadence. Items with a Category follow the Add from
	 * categories mapping; the rest are fixed expenses.
	 */
	async fromRecurring(userId: string, year: number): Promise<ForecastRowDto[]> {
		const [items, linked, sections, categories, accounts, base] = await Promise.all([
			this.db
				.select()
				.from(recurringItem)
				.where(and(eq(recurringItem.userId, userId), eq(recurringItem.isActive, true))),
			this.db
				.select({ id: forecastRow.recurringItemId })
				.from(forecastRow)
				.where(and(eq(forecastRow.userId, userId), isNotNull(forecastRow.recurringItemId))),
			this.sections.list(userId),
			this.categories.list(userId),
			this.db
				.select({
					id: bankAccount.id,
					displayGroup: bankAccount.displayGroup,
					isoCurrencyCode: bankAccount.isoCurrencyCode,
				})
				.from(bankAccount)
				.where(eq(bankAccount.userId, userId)),
			this.settings.get(userId).then((settings) => settings.currency),
		]);
		const linkedIds = new Set(linked.map((row) => row.id));
		const sectionByType = new Map(sections.map((section) => [section.type, section.id]));
		const categoryById = new Map(categories.map((item) => [item.id, item]));
		const accountById = new Map(accounts.map((account) => [account.id, account]));

		const created: ForecastRowDto[] = [];
		for (const item of items.filter((entry) => !linkedIds.has(entry.id))) {
			const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
			const sectionId = sectionByType.get(category ? sectionTypeFor(category) : "fixed_expense");
			if (!sectionId) continue;
			const account = item.bankAccountId ? accountById.get(item.bankAccountId) : undefined;
			const amount =
				(await this.fx.convert(item.amount, account?.isoCurrencyCode ?? base, base)) ?? item.amount;
			created.push(
				await this.insertRow(userId, sectionId, item, {
					bankAccountId: account && PAYABLE_GROUPS.has(account.displayGroup) ? account.id : null,
					amounts: planAmounts(item, amount, year),
					year,
				}),
			);
		}
		return created;
	}

	private insertRow(
		userId: string,
		sectionId: string,
		item: ItemRow,
		plan: { bankAccountId: string | null; amounts: Map<number, number>; year: number },
	) {
		return this.db.transaction(async (tx) => {
			const [row] = await tx
				.insert(forecastRow)
				.values({
					userId,
					sectionId,
					name: item.merchantName,
					recurringItemId: item.id,
					categoryId: item.categoryId,
					bankAccountId: plan.bankAccountId,
					dayOfMonth: Number(item.nextDate.slice(8, 10)),
				})
				.returning();
			if (!row) throw new Error("Could not create forecast row");
			const cells = [...plan.amounts].map(([month, amount]) => ({
				forecastRowId: row.id,
				year: plan.year,
				month,
				amount,
			}));
			if (cells.length > 0) await tx.insert(forecastCell).values(cells);
			return toDto(row);
		});
	}
}

/** Month (1-12) → Base cents due in `year`, counting each scheduled date of the cadence. */
function planAmounts(item: ItemRow, amount: number, year: number) {
	const cadence = item.cadence as Cadence;
	const amounts = new Map<number, number>();
	for (const date of datesInYear(item.nextDate, cadence, year)) {
		const month = Number(date.slice(5, 7));
		amounts.set(month, (amounts.get(month) ?? 0) + amount);
	}
	return amounts;
}

/** Scheduled dates in `year`, extending the schedule back and forward from `nextDate`. */
function datesInYear(nextDate: string, cadence: Cadence, year: number) {
	const start = `${year}-01-01`;
	const end = `${year}-12-31`;
	const step = (date: string, direction: 1 | -1) =>
		cadence === "weekly"
			? addDays(date, WEEK_DAYS * direction)
			: addMonths(date, (cadence === "monthly" ? 1 : 12) * direction);
	let date = nextDate;
	while (date > start) date = step(date, -1);
	const dates: string[] = [];
	for (; date <= end; date = step(date, 1)) {
		if (date >= start) dates.push(date);
	}
	return dates;
}
