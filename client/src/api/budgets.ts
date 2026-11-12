import { api } from "@/api/client";
import type { Budget, BudgetMonth } from "@/types";

export function getBudgetMonth(year: number, month: number) {
	return api<BudgetMonth>(`/budgets?year=${year}&month=${month}`);
}

export function saveBudget(body: { categoryId: string; month: string; amount: number }) {
	return api<Budget>("/budgets", { method: "POST", body: JSON.stringify(body) });
}

export function deleteBudget(id: string) {
	return api<{ success: true }>(`/budgets/${id}`, { method: "DELETE" });
}

export function copyPreviousBudget(targetMonth: string) {
	return api<Budget[]>("/budgets/copy-previous", {
		method: "POST",
		body: JSON.stringify({ targetMonth }),
	});
}
