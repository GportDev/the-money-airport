import type { GoalStatus, GoalType } from "./goals.types";

/** Share of the target reached, 0..1. Pay-down counts what has been paid off. */
export function percentComplete(
	type: GoalType,
	target: number,
	current: number,
	hasSource: boolean,
) {
	if (!hasSource || target <= 0) {
		return 0;
	}
	const reached = type === "pay_down" ? target - current : current;
	return Math.min(1, Math.max(0, reached / target));
}

/** Money still needed: the gap to target for save-up, what is owed for pay-down. */
export function remainingFor(type: GoalType, target: number, current: number) {
	return type === "pay_down" ? Math.max(0, current) : Math.max(0, target - current);
}

function monthIndex(isoDate: string) {
	return Number(isoDate.slice(0, 4)) * 12 + Number(isoDate.slice(5, 7)) - 1;
}

/**
 * At risk when the monthly amount needed to hit the target date is more than the User's
 * average monthly net cash flow. No target date, or nothing left to do, is on track.
 */
export function goalStatus(input: {
	remaining: number;
	targetDate: string | null;
	today: string;
	monthlyCapacity: number;
}): GoalStatus {
	const { remaining, targetDate, today, monthlyCapacity } = input;
	if (remaining <= 0 || !targetDate) {
		return "on_track";
	}
	if (targetDate < today) {
		return "at_risk";
	}
	const monthsLeft = Math.max(1, monthIndex(targetDate) - monthIndex(today));
	return remaining / monthsLeft > monthlyCapacity ? "at_risk" : "on_track";
}
