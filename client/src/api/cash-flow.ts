import { api } from "@/api/client";
import type { CashFlow } from "@/types";

export function getCashFlow(year: number, month: number, accountId?: string | null) {
	const params = new URLSearchParams({ year: String(year), month: String(month) });
	if (accountId) params.set("accountId", accountId);
	return api<CashFlow>(`/cash-flow?${params.toString()}`);
}
