import type { DebtStrategy, PaymentRule } from "@/types";

export const STRATEGY_OPTIONS: { value: DebtStrategy; label: string }[] = [
	{ value: "avalanche", label: "Avalanche" },
	{ value: "snowball", label: "Snowball" },
	{ value: "custom", label: "Custom" },
];

export const PAYMENT_RULE_OPTIONS: { value: PaymentRule; label: string }[] = [
	{ value: "statement_balance", label: "Statement balance" },
	{ value: "new_charges", label: "New charges" },
	{ value: "minimum", label: "Minimum" },
	{ value: "fixed", label: "Fixed amount" },
];

/** Radix Select needs a non-empty value; this one stands for the last day of the month (null). */
export const LAST_DAY = "last";

export function bpsToPercentText(bps: number | null) {
	return bps === null ? "" : String(bps / 100);
}

export function percentTextToBps(text: string) {
	return text.trim() === "" ? null : Math.round(Number(text) * 100);
}

/** "Jun 2027" for `YYYY-MM`. */
export function monthName(month: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${month}-01T00:00:00Z`));
}

/** Whole days from today to an ISO date; negative when past. */
export function daysUntil(isoDate: string, today: string) {
	return Math.round(
		(Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
	);
}

export function formatPercentShare(share: number) {
	return `${Math.round(share * 100)}%`;
}
