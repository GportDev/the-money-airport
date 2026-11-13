/** `YYYY-MM-DD` plus whole months, with the day clamped to the target month's last day. */
export function addMonths(date: string, months: number) {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7)) - 1 + months;
	const day = Number(date.slice(8, 10));
	const target = new Date(Date.UTC(year, month, 1));
	const last = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
	).getUTCDate();
	target.setUTCDate(Math.min(day, last));
	return target.toISOString().slice(0, 10);
}
