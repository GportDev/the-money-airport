import { addDays, lastDayOf, pad } from "../forecast/dates";
import type { Cadence } from "./recurring.types";

const DAY_MS = 86_400_000;
/** Stops a long-overdue weekly item from looping forever. */
const MAX_OCCURRENCES = 60;

/** Moves a date by whole months, clamping to the last day of a shorter month. */
export function addMonths(date: string, months: number) {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7)) - 1 + months;
	const targetYear = year + Math.floor(month / 12);
	const targetMonth = (((month % 12) + 12) % 12) + 1;
	const key = `${targetYear}-${pad(targetMonth)}`;
	const day = Math.min(Number(date.slice(8, 10)), lastDayOf(key));
	return `${key}-${pad(day)}`;
}

export function nextOccurrence(date: string, cadence: Cadence) {
	if (cadence === "weekly") return addDays(date, 7);
	return addMonths(date, cadence === "monthly" ? 1 : 12);
}

export function daysBetween(from: string, to: string) {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Every scheduled date from `nextDate` through `through`, inclusive. */
export function occurrencesThrough(nextDate: string, cadence: Cadence, through: string) {
	const dates: string[] = [];
	let date = nextDate;
	while (date <= through && dates.length < MAX_OCCURRENCES) {
		dates.push(date);
		date = nextOccurrence(date, cadence);
	}
	return dates;
}
