import type { BankAccount, Goal, GoalType } from "@/types";

export const GOAL_TABS: { value: GoalType; label: string }[] = [
	{ value: "save_up", label: "Save up" },
	{ value: "pay_down", label: "Pay down" },
];

export const GOAL_EDIT_ACCOUNTS_PARAM = "edit";
export const GOAL_EDIT_ACCOUNTS_VALUE = "accounts";

export function parseGoalTab(value: string | null): GoalType {
	return value === "pay_down" ? "pay_down" : "save_up";
}

export function formatPercent(fraction: number) {
	return `${Math.round(fraction * 100)}%`;
}

/** BankAccounts a Goal of this type may hold: visible, the right side of the ledger, no Funds. */
export function associableAccounts(type: GoalType, accounts: BankAccount[]) {
	return accounts.filter(
		(account) =>
			!account.isHidden &&
			account.funds.length === 0 &&
			(type === "save_up" ? account.isAsset : !account.isAsset),
	);
}

/** Visible asset BankAccounts not already associated with a Goal can host Funds. */
export function hostableAccounts(accounts: BankAccount[], goals: Goal[]) {
	const associated = new Set(goals.flatMap((goal) => goal.accounts.map((account) => account.id)));
	return accounts.filter(
		(account) => !account.isHidden && account.isAsset && !associated.has(account.id),
	);
}

/** Which Goal each BankAccount is on, so moving it can say where it came from. */
export function goalByAccount(goals: Goal[]) {
	const map = new Map<string, Goal>();
	for (const goal of goals) {
		for (const account of goal.accounts) {
			map.set(account.id, goal);
		}
	}
	return map;
}
