import type { Cadence } from "@/types";

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

const CADENCE_LABELS: Record<Cadence, string> = {
	weekly: "Every week",
	monthly: "Every month",
	yearly: "Every year",
};

export function cadenceLabel(cadence: Cadence) {
	return CADENCE_LABELS[cadence];
}

/** "today", "tomorrow", "in 15 days", or "3 days overdue". */
export function countdownLabel(daysUntil: number) {
	if (daysUntil === 0) return "today";
	if (daysUntil === 1) return "tomorrow";
	if (daysUntil > 1) return `in ${daysUntil} days`;
	const overdue = -daysUntil;
	return `${overdue} ${overdue === 1 ? "day" : "days"} overdue`;
}

export type RecurringDraft = { amount: string; cadence: Cadence; nextDate: string };

/** Null when the draft is valid; otherwise the message to show. */
export function draftError(draft: RecurringDraft, cents: number) {
	if (!Number.isFinite(cents) || cents <= 0) return "Enter an amount above 0.";
	if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.nextDate)) return "Pick the next date.";
	return null;
}
