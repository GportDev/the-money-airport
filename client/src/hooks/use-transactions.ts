import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	bulkCategorize,
	createTransaction,
	deleteTransaction,
	getMerchants,
	getRefundCandidates,
	getTransaction,
	getTransactions,
	linkRefund,
	splitTransaction,
	type TransactionCreateInput,
	type TransactionUpdateInput,
	unlinkRefund,
	unsplitTransaction,
	updateTransaction,
} from "@/api/transactions";
import type { SplitPartInput, TransactionFilters } from "@/types";

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
			void client.invalidateQueries({ queryKey: ["budgets"] });
			void client.invalidateQueries({ queryKey: ["reports"] });
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

export function useSplitTransaction() {
	return useTransactionMutation(({ id, parts }: { id: string; parts: SplitPartInput[] }) =>
		splitTransaction(id, parts),
	);
}

export function useUnsplitTransaction() {
	return useTransactionMutation((id: string) => unsplitTransaction(id));
}

export function useMerchants() {
	return useQuery({
		queryKey: ["transactions", "merchants"],
		queryFn: getMerchants,
		staleTime: 5 * 60 * 1000,
	});
}

export function useRefundCandidates(id: string, enabled: boolean) {
	return useQuery({
		queryKey: ["transactions", "refund-candidates", id],
		queryFn: () => getRefundCandidates(id),
		enabled,
		staleTime: 5 * 60 * 1000,
	});
}

export function useLinkRefund() {
	return useTransactionMutation(({ id, originalId }: { id: string; originalId: string }) =>
		linkRefund(id, originalId),
	);
}

export function useUnlinkRefund() {
	return useTransactionMutation((id: string) => unlinkRefund(id));
}
