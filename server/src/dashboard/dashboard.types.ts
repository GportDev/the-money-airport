import type { NetWorthRange } from "../accounts/accounts.types";
import type { DashboardWidget } from "../settings/dashboard-widgets";
import type { TransactionListItem } from "../transactions/transactions.types";

export type BudgetGroupKey = "fixed" | "flexible" | "non_monthly";

/** Widgets the User hid come back as null and are not computed. */
export type DashboardPayload = {
	month: string;
	baseCurrency: string;
	greetingName: string;
	hasAccounts: boolean;
	widgets: DashboardWidget[];
	budget: {
		hasBudget: boolean;
		groups: { key: BudgetGroupKey; planned: number; spent: number; remaining: number }[];
	} | null;
	netWorth: {
		range: NetWorthRange;
		current: number;
		change: number;
		changePercent: number;
		series: { date: string; value: number }[];
	} | null;
	spending: {
		total: number;
		thisMonth: { day: number; amount: number }[];
		lastMonth: { day: number; amount: number }[];
	} | null;
	transactions: TransactionListItem[] | null;
	recurring: { remainingDue: number; upcoming: never[] } | null;
};
