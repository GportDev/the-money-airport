import type { BankAccount } from "@/types";

const BPS_PER_PERCENT = 100;

/** Savings and investment BankAccounts can carry a User-entered APY. */
export function earnsApy(account: Pick<BankAccount, "type" | "displayGroup">) {
	return account.type === "savings" || account.displayGroup === "investment";
}

export function bpsToPercent(bps: number) {
	return String(bps / BPS_PER_PERCENT);
}

export function percentToBps(percent: string) {
	return Math.round(Number(percent) * BPS_PER_PERCENT);
}

export function formatApy(bps: number) {
	return `${(bps / BPS_PER_PERCENT).toFixed(2)}% APY`;
}
