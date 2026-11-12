import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, lt, lte, max, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { CategoriesService, type CategoryDto } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { budget } from "../db/schema/budget";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import { SettingsService } from "../settings/settings.service";
import type {
	BudgetCategoryRow,
	BudgetDto,
	BudgetGroupKey,
	BudgetGroupSummary,
	BudgetMonth,
} from "./budgets.types";

const GROUP_ORDER: BudgetGroupKey[] = ["income", "fixed", "flexible", "non_monthly"];
const notTransfer = sql`not (${transaction.tags} && array['transfer','savings_transfer']::text[])`;

type BudgetRow = typeof budget.$inferSelect;

function pad(value: number) {
	return String(value).padStart(2, "0");
}

function monthStartOf(year: number, month: number) {
	return `${year}-${pad(month)}-01`;
}

function previousMonthStart(monthStart: string) {
	const year = Number(monthStart.slice(0, 4));
	const month = Number(monthStart.slice(5, 7));
	return month === 1 ? monthStartOf(year - 1, 12) : monthStartOf(year, month - 1);
}

function currentMonthStart() {
	const now = new Date();
	return monthStartOf(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

function groupOf(row: CategoryDto): BudgetGroupKey {
	return row.kind === "income" ? "income" : (row.budgetGroup ?? "flexible");
}

function remainingFor(group: BudgetGroupKey, planned: number, actual: number) {
	return group === "income" ? actual - planned : planned - actual;
}

function toDto(row: BudgetRow): BudgetDto {
	return { id: row.id, categoryId: row.categoryId, month: row.month, amount: row.amount };
}

@Injectable()
export class BudgetsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly categories: CategoriesService,
		private readonly settings: SettingsService,
		private readonly fx: FxService,
	) {}

	async month(userId: string, year: number, month: number): Promise<BudgetMonth> {
		const monthStart = monthStartOf(year, month);
		const [categories, base] = await Promise.all([
			this.categories.list(userId),
			this.accounts.baseCurrency(userId),
		]);
		await this.copyForwardIfEmpty(userId, monthStart);
		const plans = await this.db
			.select()
			.from(budget)
			.where(and(eq(budget.userId, userId), eq(budget.month, monthStart)));
		const planByCategory = new Map(plans.map((row) => [row.categoryId, row]));
		const omitted = new Set<string>();
		const actuals = await this.actuals(userId, year, month, base, omitted);

		const rows = categories.map((row) =>
			toRow(row, planByCategory.get(row.id), actuals.get(row.id) ?? 0),
		);
		const groups = GROUP_ORDER.map((key) => summarize(key, rows));
		const plannedIncome = groups.find((row) => row.key === "income")?.planned ?? 0;
		const plannedExpense = groups
			.filter((row) => row.key !== "income")
			.reduce((sum, row) => sum + row.planned, 0);

		return {
			month: monthStart.slice(0, 7),
			baseCurrency: base,
			leftToBudget: plannedIncome - plannedExpense,
			groups,
			unbudgeted: rows
				.filter((row) => row.id === null)
				.sort((a, b) => b.actual - a.actual || a.categoryName.localeCompare(b.categoryName)),
			omittedCurrencies: [...omitted].sort(),
		};
	}

	/** Creates the plan, or replaces the amount when the Category already has one that month. */
	async upsert(userId: string, input: { categoryId: string; month: string; amount: number }) {
		await this.categories.owned(userId, input.categoryId);
		const [row] = await this.db
			.insert(budget)
			.values({ userId, ...input })
			.onConflictDoUpdate({
				target: [budget.userId, budget.categoryId, budget.month],
				set: { amount: input.amount, updatedAt: new Date() },
			})
			.returning();
		if (!row) {
			throw new Error("Could not save budget");
		}
		return toDto(row);
	}

	async update(userId: string, id: string, amount: number) {
		const [row] = await this.db
			.update(budget)
			.set({ amount, updatedAt: new Date() })
			.where(and(eq(budget.id, id), eq(budget.userId, userId)))
			.returning();
		if (!row) {
			throw new NotFoundException("Budget not found");
		}
		return toDto(row);
	}

	async remove(userId: string, id: string) {
		const [row] = await this.db
			.delete(budget)
			.where(and(eq(budget.id, id), eq(budget.userId, userId)))
			.returning({ id: budget.id });
		if (!row) {
			throw new NotFoundException("Budget not found");
		}
		return { success: true };
	}

	/** Copies last month's plans into Categories that have no plan in the target month. */
	copyPrevious(userId: string, targetMonth: string) {
		return this.copyInto(userId, previousMonthStart(targetMonth), targetMonth);
	}

	/**
	 * Copy-forward: opening the current or a later month with no plans copies the latest
	 * earlier month that has plans. Past months are never filled in after the fact.
	 */
	private async copyForwardIfEmpty(userId: string, monthStart: string) {
		if (monthStart < currentMonthStart()) {
			return;
		}
		const { budgetCopyForward } = await this.settings.get(userId);
		if (!budgetCopyForward) {
			return;
		}
		const [existing] = await this.db
			.select({ id: budget.id })
			.from(budget)
			.where(and(eq(budget.userId, userId), eq(budget.month, monthStart)))
			.limit(1);
		if (existing) {
			return;
		}
		const [latest] = await this.db
			.select({ month: max(budget.month) })
			.from(budget)
			.where(and(eq(budget.userId, userId), lt(budget.month, monthStart)));
		if (latest?.month) {
			await this.copyInto(userId, latest.month, monthStart);
		}
	}

	private async copyInto(userId: string, sourceMonth: string, targetMonth: string) {
		const source = await this.db
			.select()
			.from(budget)
			.where(and(eq(budget.userId, userId), eq(budget.month, sourceMonth)))
			.orderBy(asc(budget.createdAt));
		if (source.length === 0) {
			return [];
		}
		const created = await this.db
			.insert(budget)
			.values(
				source.map((row) => ({
					userId,
					categoryId: row.categoryId,
					month: targetMonth,
					amount: row.amount,
				})),
			)
			.onConflictDoNothing()
			.returning();
		return created.map(toDto);
	}

	/**
	 * Net Money per Category for the month in Base currency, Transfers excluded, Pending
	 * counted. Each day converts at that day's rate, falling back to the latest one.
	 */
	private async actuals(
		userId: string,
		year: number,
		month: number,
		base: string,
		omitted: Set<string>,
	) {
		const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
		const rows = await this.db
			.select({
				categoryId: transaction.categoryId,
				currency: transaction.isoCurrencyCode,
				date: transaction.date,
				amount: sql<string>`sum(${transaction.amount})`,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, monthStartOf(year, month)),
					lte(transaction.date, `${year}-${pad(month)}-${pad(daysInMonth)}`),
					notTransfer,
				),
			)
			.groupBy(transaction.categoryId, transaction.isoCurrencyCode, transaction.date);

		const net = new Map<string, number>();
		for (const row of rows) {
			const rate =
				(await this.fx.rateFor(row.currency, base, row.date)) ??
				(await this.fx.rateFor(row.currency, base));
			if (rate === null) {
				omitted.add(row.currency);
				continue;
			}
			net.set(
				row.categoryId,
				(net.get(row.categoryId) ?? 0) + Math.round(Number(row.amount) * rate),
			);
		}
		return net;
	}
}

/** Refunds net against spend; a Category that took in more than it spent reads as 0. */
function toRow(row: CategoryDto, plan: BudgetRow | undefined, net: number): BudgetCategoryRow {
	const group = groupOf(row);
	const actual = Math.max(0, group === "income" ? net : -net);
	const planned = plan?.amount ?? 0;
	return {
		id: plan?.id ?? null,
		categoryId: row.id,
		categoryName: row.name,
		categoryIcon: row.icon,
		categoryColor: row.color,
		group,
		planned,
		actual,
		remaining: remainingFor(group, planned, actual),
		percentUsed: planned > 0 ? actual / planned : 0,
	};
}

function summarize(key: BudgetGroupKey, rows: BudgetCategoryRow[]): BudgetGroupSummary {
	const inGroup = rows.filter((row) => row.group === key);
	const categories = inGroup.filter((row) => row.id !== null);
	const planned = categories.reduce((sum, row) => sum + row.planned, 0);
	const actual = inGroup.reduce((sum, row) => sum + row.actual, 0);
	return { key, planned, actual, remaining: remainingFor(key, planned, actual), categories };
}
