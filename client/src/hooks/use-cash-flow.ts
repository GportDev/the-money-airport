import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCashFlow } from "@/api/cash-flow";

export function useCashFlow(year: number, month: number, accountId?: string | null) {
	return useQuery({
		queryKey: ["cash-flow", year, month, accountId ?? null],
		queryFn: () => getCashFlow(year, month, accountId),
		staleTime: 5 * 60 * 1000,
		placeholderData: keepPreviousData,
	});
}
