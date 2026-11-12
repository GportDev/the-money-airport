export type ReportRange = { dateFrom: string; dateTo: string };

type ReportEnvelope = {
	baseCurrency: string;
	/** Currencies with no FX rate into Base currency; their amounts are left out. */
	omittedCurrencies: string[];
};

export type CategoryTotal = {
	categoryId: string;
	categoryName: string;
	color: string;
	icon: string;
	/** Spend net of refunds, Base cents, always > 0. */
	total: number;
};

export type SpendingReport = ReportEnvelope & { categories: CategoryTotal[] };

export type IncomeVsExpensesReport = ReportEnvelope & {
	months: { month: string; income: number; expenses: number }[];
};

export type CashFlowTrendReport = ReportEnvelope & {
	months: { month: string; net: number }[];
};

export type BalanceHistoryReport = ReportEnvelope & {
	accounts: { accountId: string; name: string; isAsset: boolean }[];
	/** End-of-day balance in Base cents; liabilities read as the amount owed. */
	points: { date: string; accountId: string; balance: number }[];
};
