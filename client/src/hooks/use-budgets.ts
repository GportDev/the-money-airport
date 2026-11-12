import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { copyPreviousBudget, deleteBudget, getBudgetMonth, saveBudget } from "@/api/budgets";

export function useBudgetMonth(year: number, month: number) {
	return useQuery({
		queryKey: ["budgets", year, month],
		queryFn: () => getBudgetMonth(year, month),
		staleTime: 5 * 60 * 1000,
		placeholderData: keepPreviousData,
	});
}

function useBudgetMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["budgets"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useSaveBudget() {
	return useBudgetMutation(saveBudget);
}

export function useDeleteBudget() {
	return useBudgetMutation(deleteBudget);
}

export function useCopyPreviousBudget() {
	return useBudgetMutation(copyPreviousBudget);
}
