import { monthEndOf, monthStartOf } from "../forecast/dates";
import type { CreditPeriod } from "./card-benefits.types";

const MONTHS_IN_PERIOD: Record<CreditPeriod, number> = {
	month: 1,
	quarter: 3,
	half_year: 6,
	year: 12,
};

/** First and last day of the calendar period containing `date`. */
export function periodBounds(date: string, period: CreditPeriod) {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7));
	const length = MONTHS_IN_PERIOD[period];
	const firstMonth = month - ((month - 1) % length);
	return {
		start: monthStartOf(year, firstMonth),
		end: monthEndOf(year, firstMonth + length - 1),
	};
}
