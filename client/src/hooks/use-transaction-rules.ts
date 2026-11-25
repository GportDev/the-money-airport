import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteTransactionRule,
	getTransactionRules,
	saveTransactionRule,
	type TransactionRuleInput,
} from "@/api/transaction-rules";

export function useTransactionRules() {
	return useQuery({
		queryKey: ["transaction-rules"],
		queryFn: getTransactionRules,
		staleTime: 30 * 60 * 1000,
	});
}

function useRuleMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["transaction-rules"] });
			// Saving a rule recategorizes matching Transactions, which moves every rollup.
			void client.invalidateQueries({ queryKey: ["transactions"] });
			void client.invalidateQueries({ queryKey: ["cash-flow"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
			void client.invalidateQueries({ queryKey: ["budgets"] });
			void client.invalidateQueries({ queryKey: ["reports"] });
		},
	});
}

export function useSaveTransactionRule() {
	return useRuleMutation((body: TransactionRuleInput) => saveTransactionRule(body));
}

export function useDeleteTransactionRule() {
	return useRuleMutation((id: string) => deleteTransactionRule(id));
}
