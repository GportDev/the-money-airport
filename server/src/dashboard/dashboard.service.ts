import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import type { NetWorthRange } from "../accounts/accounts.types";
import { BudgetsService } from "../budgets/budgets.service";
import { CashFlowService } from "../cash-flow/cash-flow.service";
import type { CashFlowResponse } from "../cash-flow/cash-flow.types";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import type { DashboardWidgetId } from "../settings/dashboard-widgets";
import { SettingsService } from "../settings/settings.service";
import { TransactionsService } from "../transactions/transactions.service";
import type { BudgetGroupKey, DashboardPayload } from "./dashboard.types";

const RECENT_TRANSACTIONS = 8;

function pad(value: number) {
	return String(value).padStart(2, "0");
}

/** Running total by day; stops after `lastDay` so the current month ends at today. */
function cumulative(flow: CashFlowResponse, lastDay: number) {
	let total = 0;
	return flow.daily
		.filter((row) => row.day <= lastDay)
		.map((row) => {
			total += row.expenses;
			return { day: row.day, amount: total };
		});
}

@Injectable()
export class DashboardService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly cashFlow: CashFlowService,
		private readonly transactions: TransactionsService,
		private readonly settings: SettingsService,
		private readonly budgets: BudgetsService,
	) {}

	async get(
		user: { id: string; name: string },
		year: number,
		month: number,
		netWorthRange: NetWorthRange,
	): Promise<DashboardPayload> {
		const settings = await this.settings.get(user.id);
		const visible = new Set<DashboardWidgetId>(
			settings.dashboardWidgets.filter((widget) => widget.visible).map((widget) => widget.id),
		);
		const [accountRow] = await this.db
			.select({ id: bankAccount.id })
			.from(bankAccount)
			.where(eq(bankAccount.userId, user.id))
			.limit(1);

		const [budget, netWorth, spending, transactions] = await Promise.all([
			visible.has("budget") ? this.budget(user.id, year, month) : null,
			visible.has("net_worth") ? this.netWorth(user.id, netWorthRange) : null,
			visible.has("spending") ? this.spending(user.id, year, month) : null,
			visible.has("transactions") ? this.recent(user.id) : null,
		]);

		return {
			month: `${year}-${pad(month)}`,
			baseCurrency: settings.currency,
			greetingName: user.name.trim().split(/\s+/)[0] ?? "",
			hasAccounts: Boolean(accountRow),
			widgets: settings.dashboardWidgets,
			budget,
			netWorth,
			spending,
			transactions,
			// Recurring arrives with Phase 7; the widget shows its empty state until then.
			recurring: visible.has("recurring") ? { remainingDue: 0, upcoming: [] } : null,
		};
	}

	private async netWorth(userId: string, range: NetWorthRange) {
		const result = await this.accounts.netWorth(userId, range);
		return {
			range,
			current: result.current,
			change: result.change,
			changePercent: result.changePercent,
			series: result.series,
		};
	}

	private async recent(userId: string) {
		const page = await this.transactions.list(userId, {
			limit: RECENT_TRANSACTIONS,
			accountIds: [],
			categoryIds: [],
			sortDir: "desc",
		});
		return page.data;
	}

	/** Month-to-date spend vs last month, as running totals across days of the month. */
	private async spending(userId: string, year: number, month: number) {
		const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
		const [current, last] = await Promise.all([
			this.cashFlow.get(userId, year, month, undefined, { runningBalance: false }),
			this.cashFlow.get(userId, previous.year, previous.month, undefined, {
				runningBalance: false,
			}),
		]);
		const today = new Date().toISOString().slice(0, 10);
		const monthKey = `${year}-${pad(month)}`;
		const lastDay =
			monthKey < today.slice(0, 7)
				? current.daily.length
				: monthKey === today.slice(0, 7)
					? Number(today.slice(8, 10))
					: 0;
		const thisMonth = cumulative(current, lastDay);
		return {
			total: thisMonth[thisMonth.length - 1]?.amount ?? 0,
			thisMonth,
			lastMonth: cumulative(last, last.daily.length),
		};
	}

	/** Expense groups of this month's Budget; `hasBudget` is false until something is planned. */
	private async budget(userId: string, year: number, month: number) {
		const result = await this.budgets.month(userId, year, month);
		const expenseGroups = result.groups.filter(
			(group): group is typeof group & { key: BudgetGroupKey } => group.key !== "income",
		);
		return {
			hasBudget: result.groups.some((group) => group.categories.length > 0),
			groups: expenseGroups.map(({ key, planned, actual, remaining }) => ({
				key,
				planned,
				spent: actual,
				remaining,
			})),
		};
	}
}
