import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	bulkCategorize,
	createTransaction,
	deleteTransaction,
	getTransaction,
	getTransactions,
	type TransactionCreateInput,
	type TransactionUpdateInput,
	updateTransaction,
} from "../api/transactions";
import type { TransactionFilters } from "../types";

export function useTransactionFeed(filters: TransactionFilters) {
	return useInfiniteQuery({
		queryKey: ["transactions", "feed", filters],
		queryFn: ({ pageParam }) => getTransactions(filters, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (last) => last.meta.nextCursor,
		staleTime: 5 * 60 * 1000,
	});
}

export function useTransaction(id: string | null) {
	return useQuery({
		queryKey: ["transactions", "detail", id],
		queryFn: () => getTransaction(id ?? ""),
		enabled: Boolean(id),
	});
}

function useTransactionMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["transactions"] });
			void client.invalidateQueries({ queryKey: ["cash-flow"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});
}

export function useCreateTransaction() {
	return useTransactionMutation((body: TransactionCreateInput) => createTransaction(body));
}

export function useUpdateTransaction() {
	return useTransactionMutation(({ id, ...body }: { id: string } & TransactionUpdateInput) =>
		updateTransaction(id, body),
	);
}

export function useBulkCategorize() {
	return useTransactionMutation(({ ids, categoryId }: { ids: string[]; categoryId: string }) =>
		bulkCategorize(ids, categoryId),
	);
}

export function useDeleteTransaction() {
	return useTransactionMutation((id: string) => deleteTransaction(id));
}
