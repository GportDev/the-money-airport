import { api } from "@/api/client";
import type { Cadence, RecurringCandidate, RecurringListItem, RecurringMonth } from "@/types";

export type CreateRecurringInput = {
	merchantName: string;
	amount: number;
	cadence: Cadence;
	nextDate: string;
	bankAccountId?: string | null;
	categoryId?: string | null;
	isActive?: boolean;
	isManual?: boolean;
};

export type UpdateRecurringInput = {
	id: string;
	amount?: number;
	cadence?: Cadence;
	nextDate?: string;
	isActive?: boolean;
};

export function getRecurring() {
	return api<RecurringMonth>("/recurring");
}

export function detectRecurring() {
	return api<RecurringCandidate[]>("/recurring/detect", { method: "POST" });
}

export function createRecurring(body: CreateRecurringInput) {
	return api<RecurringListItem>("/recurring", { method: "POST", body: JSON.stringify(body) });
}

export function updateRecurring({ id, ...body }: UpdateRecurringInput) {
	return api<RecurringListItem>(`/recurring/${id}`, {
		method: "PATCH",
		body: JSON.stringify(body),
	});
}

export function markRecurringPaid(id: string) {
	return api<RecurringListItem>(`/recurring/${id}/mark-paid`, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

export function skipRecurring(id: string) {
	return api<RecurringListItem>(`/recurring/${id}/skip`, { method: "POST" });
}

export function deleteRecurring(id: string) {
	return api<{ success: true }>(`/recurring/${id}`, { method: "DELETE" });
}
