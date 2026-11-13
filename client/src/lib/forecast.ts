import { todayIso } from "@/lib/format";
import type { ForecastSectionType, OneOffStatus } from "@/types";

export const FORECAST_TABS = [
	{ value: "year", label: "Year" },
	{ value: "month", label: "Month" },
	{ value: "debt", label: "Debt" },
] as const;

export type ForecastTab = (typeof FORECAST_TABS)[number]["value"];

export const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

export const ONE_OFF_STATUS_LABELS: Record<OneOffStatus, string> = {
	expected: "Expected",
	done: "Done",
	cancelled: "Cancelled",
};

/** Sections whose items take Money in; every other section pays out. */
export function isInflowSection(type: ForecastSectionType) {
	return type === "revenue";
}

export function parseForecastTab(value: string | null): ForecastTab {
	return value === "month" || value === "debt" ? value : "year";
}

/** `?year=YYYY`, falling back to the current year. */
export function parseYear(value: string | null) {
	const year = Number(value);
	return Number.isInteger(year) && year >= 2000 && year <= 2100
		? year
		: Number(todayIso().slice(0, 4));
}

export function shortMonthName(month: number) {
	return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
		new Date(Date.UTC(2000, month - 1, 1)),
	);
}

export function longMonthName(month: number) {
	return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
		new Date(Date.UTC(2000, month - 1, 1)),
	);
}

/** "Mar 6" for a YYYY-MM-DD date. */
export function shortDate(isoDate: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${isoDate}T00:00:00Z`));
}
