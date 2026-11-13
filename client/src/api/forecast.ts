import { api } from "@/api/client";
import type {
	ForecastMonth,
	ForecastRow,
	ForecastSection,
	ForecastSummary,
	OneOff,
	OneOffStatus,
} from "@/types";

export type ForecastRowInput = {
	name: string;
	dayOfMonth: number | null;
	bankAccountId: string | null;
	goalId: string | null;
};

export type OneOffInput = {
	name: string;
	date: string;
	amount: number;
	bankAccountId: string | null;
	goalId: string | null;
};

export function getForecastSections(year: number) {
	return api<ForecastSection[]>(`/forecast/sections?year=${year}`);
}

export function getForecastSummary(year: number) {
	return api<ForecastSummary>(`/forecast/summary?year=${year}`);
}

export function getForecastMonth(year: number, month: number) {
	return api<ForecastMonth>(`/forecast/month?year=${year}&month=${month}`);
}

export function createForecastRow(body: ForecastRowInput & { sectionId: string }) {
	return api<ForecastRow>("/forecast/rows", { method: "POST", body: JSON.stringify(body) });
}

export function updateForecastRow({ id, ...body }: ForecastRowInput & { id: string }) {
	return api<ForecastRow>(`/forecast/rows/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function setForecastAmounts({
	id,
	...body
}: {
	id: string;
	year: number;
	amounts: Record<number, number>;
}) {
	return api<ForecastRow>(`/forecast/rows/${id}/amounts`, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function deleteForecastRow(id: string) {
	return api<{ success: true }>(`/forecast/rows/${id}`, { method: "DELETE" });
}

export function addRowsFromCategories(year: number) {
	return api<ForecastRow[]>("/forecast/rows/from-categories", {
		method: "POST",
		body: JSON.stringify({ year }),
	});
}

export function createOneOff(body: OneOffInput & { sectionId: string }) {
	return api<OneOff>("/forecast/one-offs", { method: "POST", body: JSON.stringify(body) });
}

export function updateOneOff({
	id,
	...body
}: Partial<OneOffInput> & { id: string; status?: OneOffStatus }) {
	return api<OneOff>(`/forecast/one-offs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteOneOff(id: string) {
	return api<{ success: true }>(`/forecast/one-offs/${id}`, { method: "DELETE" });
}
