import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFundEntry,
	createGoal,
	deleteFundEntry,
	deleteGoal,
	getFundEntries,
	getGoals,
	setGoalAccounts,
	updateGoal,
} from "@/api/goals";
import type { GoalType } from "@/types";

const STALE_TIME = 5 * 60 * 1000;

export function useGoals(type?: GoalType) {
	return useQuery({
		queryKey: ["goals", type ?? "all"],
		queryFn: () => getGoals(type),
		staleTime: STALE_TIME,
	});
}

export function useFundEntries(goalId: string) {
	return useQuery({
		queryKey: ["goals", "entries", goalId],
		queryFn: () => getFundEntries(goalId),
		staleTime: STALE_TIME,
	});
}

/** Goal and Fund changes move progress, Unassigned on hosts, and the Transaction drawer. */
function useGoalMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["goals"] });
			void client.invalidateQueries({ queryKey: ["accounts"] });
			void client.invalidateQueries({ queryKey: ["transactions"] });
		},
	});
}

export function useCreateGoal() {
	return useGoalMutation(createGoal);
}

export function useUpdateGoal() {
	return useGoalMutation(updateGoal);
}

export function useDeleteGoal() {
	return useGoalMutation(deleteGoal);
}

export function useSetGoalAccounts() {
	return useGoalMutation(setGoalAccounts);
}

export function useCreateFundEntry() {
	return useGoalMutation(createFundEntry);
}

export function useDeleteFundEntry() {
	return useGoalMutation(deleteFundEntry);
}
