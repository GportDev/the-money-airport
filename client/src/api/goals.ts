import { api } from "@/api/client";
import type { FundEntry, FundEntryKind, Goal, GoalFunding, GoalsList, GoalType } from "@/types";

export type GoalInput = {
	name: string;
	targetAmount: number;
	targetDate: string | null;
	icon: string;
	color: string;
};

export type CreateGoalInput = GoalInput & {
	type: GoalType;
	funding: GoalFunding;
	hostBankAccountId?: string;
};

export type FundEntryInput =
	| { transactionId: string }
	| { date: string; amount: number; kind: FundEntryKind; note: string | null };

export function getGoals(type?: GoalType) {
	return api<GoalsList>(`/goals${type ? `?type=${type}` : ""}`);
}

export function createGoal(body: CreateGoalInput) {
	return api<Goal>("/goals", { method: "POST", body: JSON.stringify(body) });
}

export function updateGoal({ id, ...body }: GoalInput & { id: string }) {
	return api<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteGoal(id: string) {
	return api<{ success: true }>(`/goals/${id}`, { method: "DELETE" });
}

export function setGoalAccounts({ id, bankAccountIds }: { id: string; bankAccountIds: string[] }) {
	return api<Goal>(`/goals/${id}/accounts`, {
		method: "PUT",
		body: JSON.stringify({ bankAccountIds }),
	});
}

/** Newest first; the first page is enough for a Fund drawer. */
export function getFundEntries(goalId: string) {
	return api<FundEntry[]>(`/goals/${goalId}/entries`);
}

export function createFundEntry({ goalId, ...body }: FundEntryInput & { goalId: string }) {
	return api<FundEntry>(`/goals/${goalId}/entries`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function deleteFundEntry({ goalId, entryId }: { goalId: string; entryId: string }) {
	return api<{ success: true }>(`/goals/${goalId}/entries/${entryId}`, { method: "DELETE" });
}
