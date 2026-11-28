import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	commitStatementImport,
	keepTransaction,
	previewStatementImport,
} from "@/api/statement-import";
import { deleteTransaction } from "@/api/transactions";
import { invalidateLedger } from "@/lib/invalidate";

export function usePreviewStatementImport() {
	return useMutation({ mutationFn: previewStatementImport });
}

/** A Statement import moves the card's balance, its Statements, and its Transactions. */
function useLedgerMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({ mutationFn: fn, onSuccess: () => invalidateLedger(client) });
}

export function useCommitStatementImport() {
	return useLedgerMutation(commitStatementImport);
}

export function useKeepTransaction() {
	return useLedgerMutation(keepTransaction);
}

export function useDeleteNotOnStatement() {
	return useLedgerMutation(deleteTransaction);
}
