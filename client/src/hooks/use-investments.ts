import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getInvestments } from "@/api/investments";
import { useHideSlowPlaceholder } from "@/hooks/use-hide-slow-placeholder";
import type { InvestmentRange } from "@/types";

export function useInvestments(range: InvestmentRange) {
	return useHideSlowPlaceholder(
		useQuery({
			queryKey: ["investments", range],
			queryFn: () => getInvestments(range),
			staleTime: 5 * 60 * 1000,
			placeholderData: keepPreviousData,
		}),
	);
}
