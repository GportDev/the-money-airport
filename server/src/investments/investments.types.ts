import type { BankAccountDto } from "../accounts/accounts.types";

export const INVESTMENT_RANGES = ["1m", "3m", "1y"] as const;

export type InvestmentRange = (typeof INVESTMENT_RANGES)[number];

export type InvestmentAccountDto = BankAccountDto & {
	/** Current balance in Base cents; null when the currency has no FX rate. */
	value: number | null;
	/** Native cents moved since the start of the range. */
	change: number;
};

export type InvestmentsResponse = {
	range: InvestmentRange;
	baseCurrency: string;
	total: number;
	/** Base cents moved since the start of the range. */
	change: number;
	changePercent: number;
	allocation: { accountId: string; name: string; value: number }[];
	/** Sorted by value, largest first; `sparkline` covers the range, native cents. */
	accounts: InvestmentAccountDto[];
	omittedCurrencies: string[];
};
