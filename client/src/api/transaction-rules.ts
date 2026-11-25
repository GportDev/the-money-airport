import { api } from "@/api/client";
import type { TransactionRule } from "@/types";

export type TransactionRuleInput = {
	merchant: string;
	amount: number | null;
	categoryId: string;
};

export function getTransactionRules() {
	return api<TransactionRule[]>("/transaction-rules");
}

export function saveTransactionRule(body: TransactionRuleInput) {
	return api<{ applied: number }>("/transaction-rules", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function deleteTransactionRule(id: string) {
	return api<{ success: true }>(`/transaction-rules/${id}`, { method: "DELETE" });
}
