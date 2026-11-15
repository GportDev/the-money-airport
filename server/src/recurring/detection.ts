import type { Cadence } from "./recurring.types";
import { daysBetween, nextOccurrence } from "./schedule";

/** One outflow from history, already reduced to what detection reads. */
export type HistoryCharge = {
	merchant: string;
	merchantLogoUrl: string | null;
	/** Native cents, negative. */
	amount: number;
	date: string;
	bankAccountId: string | null;
	categoryId: string | null;
	isoCurrencyCode: string;
};

export type DetectedPattern = {
	merchant: string;
	merchantLogoUrl: string | null;
	amount: number;
	isoCurrencyCode: string;
	cadence: Cadence;
	nextDate: string;
	bankAccountId: string | null;
	categoryId: string | null;
};

/** Gap in days between charges that reads as each cadence, and how many charges it needs. */
const CADENCE_RULES: { cadence: Cadence; minGap: number; maxGap: number; minCharges: number }[] = [
	{ cadence: "weekly", minGap: 6, maxGap: 8, minCharges: 4 },
	{ cadence: "monthly", minGap: 25, maxGap: 36, minCharges: 2 },
	{ cadence: "yearly", minGap: 350, maxGap: 380, minCharges: 2 },
];
/** Amounts may drift this far from the median, so price changes and variable bills still count. */
const AMOUNT_TOLERANCE = 0.25;
/** A pattern whose last charge is older than this many periods has stopped. */
const STALE_PERIODS = 2;

export function merchantKey(merchant: string) {
	return merchant.trim().toLowerCase();
}

/**
 * Groups charges by merchant and BankAccount and keeps groups with a steady gap and similar
 * amounts across at least two months (03_DATABASE: V1 detection).
 */
export function detectPatterns(charges: HistoryCharge[], today: string): DetectedPattern[] {
	const groups = new Map<string, HistoryCharge[]>();
	for (const charge of charges) {
		const key = `${merchantKey(charge.merchant)}|${charge.bankAccountId ?? ""}`;
		groups.set(key, [...(groups.get(key) ?? []), charge]);
	}
	return [...groups.values()].flatMap((group) => {
		const pattern = patternOf(group, today);
		return pattern ? [pattern] : [];
	});
}

function patternOf(group: HistoryCharge[], today: string): DetectedPattern | null {
	const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
	const last = sorted.at(-1);
	if (!last || new Set(sorted.map((charge) => charge.date.slice(0, 7))).size < 2) return null;
	const cadence = cadenceOf(sorted);
	if (!cadence || !hasSteadyAmounts(sorted)) return null;
	const nextDate = upcomingDate(last.date, cadence, today);
	if (nextDate === null) return null;
	return {
		merchant: last.merchant,
		merchantLogoUrl:
			[...sorted].reverse().find((charge) => charge.merchantLogoUrl)?.merchantLogoUrl ?? null,
		amount: Math.abs(last.amount),
		isoCurrencyCode: last.isoCurrencyCode,
		cadence,
		nextDate,
		bankAccountId: last.bankAccountId,
		categoryId: last.categoryId,
	};
}

function cadenceOf(sorted: HistoryCharge[]): Cadence | null {
	const gaps = sorted.slice(1).map((charge, index) => {
		const previous = sorted[index];
		return previous ? daysBetween(previous.date, charge.date) : 0;
	});
	const rule = CADENCE_RULES.find(
		({ minGap, maxGap, minCharges }) =>
			sorted.length >= minCharges && gaps.every((gap) => gap >= minGap && gap <= maxGap),
	);
	return rule?.cadence ?? null;
}

function hasSteadyAmounts(sorted: HistoryCharge[]) {
	const amounts = sorted.map((charge) => Math.abs(charge.amount)).sort((a, b) => a - b);
	const median = amounts[Math.floor(amounts.length / 2)] ?? 0;
	return amounts.every((amount) => Math.abs(amount - median) <= median * AMOUNT_TOLERANCE);
}

/** The first scheduled date on or after today, or null once the pattern has gone stale. */
function upcomingDate(lastDate: string, cadence: Cadence, today: string) {
	let date = nextOccurrence(lastDate, cadence);
	for (let missed = 0; date < today; missed += 1) {
		if (missed >= STALE_PERIODS - 1) return null;
		date = nextOccurrence(date, cadence);
	}
	return date;
}
