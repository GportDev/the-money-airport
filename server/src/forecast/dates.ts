/** UTC calendar helpers for `YYYY-MM-DD` and `YYYY-MM` strings. */

export function pad(value: number) {
	return String(value).padStart(2, "0");
}

export function addDays(date: string, days: number) {
	const next = new Date(`${date}T00:00:00Z`);
	next.setUTCDate(next.getUTCDate() + days);
	return next.toISOString().slice(0, 10);
}

/** Number of days in a `YYYY-MM` month. */
export function lastDayOf(month: string) {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Date(Date.UTC(year ?? 1970, monthNumber ?? 1, 0)).getUTCDate();
}

export function isMonthEnd(date: string) {
	return Number(date.slice(8, 10)) === lastDayOf(date.slice(0, 7));
}

export function monthKey(year: number, month: number) {
	return `${year}-${pad(month)}`;
}

export function monthStartOf(year: number, month: number) {
	return `${monthKey(year, month)}-01`;
}

export function monthEndOf(year: number, month: number) {
	return `${monthKey(year, month)}-${pad(lastDayOf(monthKey(year, month)))}`;
}

/** Every `YYYY-MM` from the month of `from` through the month of `through`. */
export function monthsBetween(from: string, through: string) {
	const months: string[] = [];
	let year = Number(from.slice(0, 4));
	let month = Number(from.slice(5, 7));
	const end = through.slice(0, 7);
	while (monthKey(year, month) <= end) {
		months.push(monthKey(year, month));
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
	}
	return months;
}

export function todayIso() {
	return new Date().toISOString().slice(0, 10);
}
