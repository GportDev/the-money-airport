import { todayIso } from "@/lib/format";

function pad(value: number) {
	return String(value).padStart(2, "0");
}

function currentYearMonth() {
	const today = todayIso();
	return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** `?month=YYYY-MM`, falling back to the User's current month. */
export function parseMonth(value: string | null) {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	if (!match) {
		return currentYearMonth();
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	return month < 1 || month > 12 ? currentYearMonth() : { year, month };
}

/** `YYYY-MM` of the month `delta` months away. */
export function shiftMonth(year: number, month: number, delta: number) {
	const index = year * 12 + (month - 1) + delta;
	return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** First day of the month as `YYYY-MM-DD`. */
export function monthStart(year: number, month: number) {
	return `${year}-${pad(month)}-01`;
}

export function monthLabel(year: number, month: number, style: "long" | "month" = "long") {
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: style === "long" ? "numeric" : undefined,
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, month - 1, 1)));
}
