import { shiftDays } from "../reports/report-dates";

/** Display groups whose past balances follow from their transactions. */
export const BACKFILL_GROUPS = ["cash", "credit"] as const;

export type DayBalance = { date: string; balance: number };
type PostedMove = { date: string; amount: number };

/**
 * End-of-day balances before `anchor.date`, walking back from the anchor through posted
 * moves (positive = income). Assets fall back by each move; liabilities, stored as the
 * amount owed, rise back. Starts the day before the earliest move, so its opening balance
 * shows. Empty when no move is on or before the anchor.
 */
export function estimatedBalances(
	anchor: DayBalance,
	moves: PostedMove[],
	isAsset: boolean,
): DayBalance[] {
	const netByDate = new Map<string, number>();
	let earliest: string | null = null;
	for (const move of moves) {
		if (move.date > anchor.date) {
			continue;
		}
		netByDate.set(move.date, (netByDate.get(move.date) ?? 0) + move.amount);
		if (earliest === null || move.date < earliest) {
			earliest = move.date;
		}
	}
	if (earliest === null) {
		return [];
	}

	const sign = isAsset ? 1 : -1;
	const start = shiftDays(earliest, -1);
	const days: DayBalance[] = [];
	let balance = anchor.balance;
	for (let day = shiftDays(anchor.date, -1); day >= start; day = shiftDays(day, -1)) {
		balance -= sign * (netByDate.get(shiftDays(day, 1)) ?? 0);
		days.push({ date: day, balance });
	}
	return days.reverse();
}
