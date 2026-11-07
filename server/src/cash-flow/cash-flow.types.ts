/**
 * What `runningBalance` measures:
 * - `net_worth`: all visible BankAccounts, assets minus liabilities (the all-accounts proxy)
 * - `balance`: one asset BankAccount's balance
 * - `owed`: one credit or loan BankAccount's amount owed
 */
export type RunningBalanceKind = "net_worth" | "balance" | "owed";

export type CashFlowDay = {
	day: number;
	date: string;
	income: number;
	/** Absolute outflow. */
	expenses: number;
	net: number;
	/** End-of-day value in Base currency; null for future days or when no BankAccount applies. */
	runningBalance: number | null;
};

export type CashFlowResponse = {
	year: number;
	month: number;
	baseCurrency: string;
	accountId: string | null;
	runningBalanceKind: RunningBalanceKind;
	summary: {
		totalIncome: number;
		totalExpenses: number;
		netCashFlow: number;
	};
	daily: CashFlowDay[];
	/** Currencies with no FX rate into Base currency; their amounts are left out. */
	omittedCurrencies: string[];
};
