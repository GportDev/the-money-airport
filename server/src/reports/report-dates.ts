export function todayIso() {
	return new Date().toISOString().slice(0, 10);
}

export function shiftDays(isoDate: string, days: number) {
	const date = new Date(`${isoDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** True for a `YYYY-MM-DD` string that names a real calendar day. */
export function isCalendarDate(value: string) {
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function daysBetween(from: string, to: string) {
	return Math.round(
		(Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
	);
}

export function eachDay(from: string, to: string) {
	const days: string[] = [];
	for (let cursor = from; cursor <= to; cursor = shiftDays(cursor, 1)) {
		days.push(cursor);
	}
	return days;
}

/** Every `YYYY-MM` the range touches, in order. */
export function eachMonth(from: string, to: string) {
	const months: string[] = [];
	let year = Number(from.slice(0, 4));
	let month = Number(from.slice(5, 7));
	const last = to.slice(0, 7);
	for (let key = from.slice(0, 7); key <= last; ) {
		months.push(key);
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
		key = `${year}-${String(month).padStart(2, "0")}`;
	}
	return months;
}

type Snapshot = { date: string; balance: number };

/**
 * End-of-day balance for each day in the range, carried forward from the latest snapshot on
 * or before that day. Days before the first snapshot are left out. `snapshots` is date-sorted.
 */
export function carryForward(snapshots: Snapshot[], days: string[]) {
	const series: Snapshot[] = [];
	let index = 0;
	let known: number | null = null;
	for (const day of days) {
		while (index < snapshots.length && (snapshots[index]?.date ?? "") <= day) {
			known = snapshots[index]?.balance ?? known;
			index += 1;
		}
		if (known !== null) {
			series.push({ date: day, balance: known });
		}
	}
	return series;
}
