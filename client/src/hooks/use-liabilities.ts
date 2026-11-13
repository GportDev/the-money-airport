import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createStatement,
	getAmortization,
	getStatementPeriod,
	setLoanTerms,
} from "@/api/liabilities";
import { invalidateLedger } from "@/lib/invalidate";

const STALE_TIME = 5 * 60 * 1000;

export function useStatementPeriod(accountId: string, periodEnd?: string) {
	return useQuery({
		queryKey: ["accounts", accountId, "statements", periodEnd ?? "latest"],
		queryFn: () => getStatementPeriod(accountId, periodEnd),
		staleTime: STALE_TIME,
	});
}

export function useAmortization(accountId: string, extra?: number, isEnabled = true) {
	return useQuery({
		queryKey: ["accounts", accountId, "amortization", extra ?? "stored"],
		queryFn: () => getAmortization(accountId, extra),
		staleTime: STALE_TIME,
		enabled: isEnabled,
	});
}

/** Statements and Loan terms move card and loan payments, so the ledger refetches. */
function useLiabilityMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({ mutationFn: fn, onSuccess: () => invalidateLedger(client) });
}

export function useCreateStatement() {
	return useLiabilityMutation(createStatement);
}

export function useSetLoanTerms() {
	return useLiabilityMutation(setLoanTerms);
}
