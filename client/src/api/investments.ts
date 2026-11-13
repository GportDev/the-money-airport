import { api } from "@/api/client";
import type { InvestmentRange, Investments } from "@/types";

export function getInvestments(range: InvestmentRange) {
	return api<Investments>(`/investments?range=${range}`);
}
