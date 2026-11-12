import { api } from "@/api/client";
import type { BudgetGroup, Category, CategoryKind } from "@/types";

export type CategoryInput = {
	name: string;
	color: string;
	icon: string;
	kind: CategoryKind;
	budgetGroup?: BudgetGroup | null;
};

export function getCategories() {
	return api<Category[]>("/categories");
}

export function createCategory(body: CategoryInput) {
	return api<Category>("/categories", { method: "POST", body: JSON.stringify(body) });
}

export function updateCategory(id: string, body: Partial<CategoryInput>) {
	return api<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteCategory(id: string) {
	return api<{ success: true }>(`/categories/${id}`, { method: "DELETE" });
}
