import { todayIso } from "@/lib/format";

const RANGE_DAYS: Record<string, number> = { "1m": 29, "3m": 89, "1y": 364 };

/** First day of an Accounts timeframe, the same window the net worth chart uses. */
export function netWorthRangeStart(range: string, today = todayIso()) {
	if (range === "ytd") {
		return `${today.slice(0, 4)}-01-01`;
	}
	const date = new Date(`${today}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - (RANGE_DAYS[range] ?? RANGE_DAYS["1m"] ?? 0));
	return date.toISOString().slice(0, 10);
}
