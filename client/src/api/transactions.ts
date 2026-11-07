import type { TransactionDetail, TransactionFilters, TransactionPage, TransferTag } from "../types";
import { api, apiUrl } from "./client";

export function transactionQuery(filters: TransactionFilters, cursor?: string | null, limit = 50) {
	const params = new URLSearchParams();
	params.set("limit", String(limit));
	if (cursor) params.set("cursor", cursor);
	if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
	if (filters.dateTo) params.set("dateTo", filters.dateTo);
	for (const id of filters.accountIds ?? []) params.append("accountId", id);
	for (const id of filters.categoryIds ?? []) params.append("categoryId", id);
	if (filters.search) params.set("search", filters.search);
	if (filters.pending !== undefined) params.set("pending", String(filters.pending));
	if (filters.amountMin !== undefined) params.set("amountMin", String(filters.amountMin));
	if (filters.amountMax !== undefined) params.set("amountMax", String(filters.amountMax));
	return params.toString();
}

/** The feed keeps `meta`, so it cannot use `api()`, which unwraps `data`. */
export async function getTransactions(filters: TransactionFilters, cursor?: string | null) {
	const res = await fetch(`${apiUrl}/transactions?${transactionQuery(filters, cursor)}`, {
		credentials: "include",
	});
	if (!res.ok) {
		throw new Error("Request failed");
	}
	return (await res.json()) as TransactionPage;
}

export function getTransaction(id: string) {
	return api<TransactionDetail>(`/transactions/${id}`);
}

export type TransactionCreateInput = {
	name: string;
	amount: number;
	date: string;
	categoryId?: string | null;
	bankAccountId?: string | null;
	notes?: string | null;
};

export function createTransaction(body: TransactionCreateInput) {
	return api<TransactionDetail>("/transactions", { method: "POST", body: JSON.stringify(body) });
}

export type TransactionUpdateInput = {
	categoryId?: string;
	notes?: string | null;
	tags?: TransferTag[];
	name?: string;
	amount?: number;
	date?: string;
	bankAccountId?: string | null;
};

export function updateTransaction(id: string, body: TransactionUpdateInput) {
	return api<TransactionDetail>(`/transactions/${id}`, {
		method: "PATCH",
		body: JSON.stringify(body),
	});
}

export function bulkCategorize(transactionIds: string[], categoryId: string) {
	return api<{ updated: number }>("/transactions/bulk-categorize", {
		method: "PATCH",
		body: JSON.stringify({ transactionIds, categoryId }),
	});
}

export function deleteTransaction(id: string) {
	return api<{ success: true }>(`/transactions/${id}`, { method: "DELETE" });
}
