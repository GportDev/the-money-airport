import { todayIso } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import type { ReportRange } from "@/types";

export const REPORT_PRESETS = [
	{ key: "this_month", label: "This Month" },
	{ key: "last_3_months", label: "Last 3 Months" },
	{ key: "ytd", label: "YTD" },
	{ key: "last_year", label: "Last Year" },
	{ key: "custom", label: "Custom" },
] as const;

export type ReportPreset = (typeof REPORT_PRESETS)[number]["key"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
	return String(value).padStart(2, "0");
}

function lastDayOf(year: number, month: number) {
	return `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;
}

function isPreset(value: string | null): value is ReportPreset {
	return REPORT_PRESETS.some((preset) => preset.key === value);
}

/** Calendar range for a preset, from the User's local today. */
export function presetRange(preset: Exclude<ReportPreset, "custom">, today = todayIso()) {
	const year = Number(today.slice(0, 4));
	const month = Number(today.slice(5, 7));
	if (preset === "ytd") {
		return { dateFrom: `${year}-01-01`, dateTo: today };
	}
	if (preset === "last_year") {
		return { dateFrom: `${year - 1}-01-01`, dateTo: `${year - 1}-12-31` };
	}
	const startIndex = year * 12 + (month - 1) - (preset === "last_3_months" ? 2 : 0);
	const startYear = Math.floor(startIndex / 12);
	return {
		dateFrom: `${startYear}-${pad((startIndex % 12) + 1)}-01`,
		dateTo: lastDayOf(year, month),
	};
}

/** `?range=&from=&to=`; a custom range with bad dates falls back to This Month's. */
export function parseReportRange(params: URLSearchParams): {
	preset: ReportPreset;
	range: ReportRange;
} {
	const value = params.get("range");
	const preset = isPreset(value) ? value : "this_month";
	if (preset !== "custom") {
		return { preset, range: presetRange(preset) };
	}
	const from = params.get("from") ?? "";
	const to = params.get("to") ?? "";
	const isValid = ISO_DATE.test(from) && ISO_DATE.test(to) && from <= to;
	return { preset, range: isValid ? { dateFrom: from, dateTo: to } : presetRange("this_month") };
}

/** "April 2025" for a `YYYY-MM` key. */
export function reportMonthLabel(month: string) {
	return monthLabel(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
}

/** The month's days that fall inside the range. */
export function monthWithinRange(month: string, range: ReportRange): ReportRange {
	const start = `${month}-01`;
	const end = lastDayOf(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
	return {
		dateFrom: start < range.dateFrom ? range.dateFrom : start,
		dateTo: end > range.dateTo ? range.dateTo : end,
	};
}
