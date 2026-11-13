import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/api/dashboard";
import { type SettingsPatch, updateSettings } from "@/api/settings";
import type { NetWorthRange } from "@/types";

export function useDashboard(netWorthRange: NetWorthRange) {
	return useQuery({
		queryKey: ["dashboard", netWorthRange],
		queryFn: () => getDashboard(netWorthRange),
		staleTime: 5 * 60 * 1000,
		placeholderData: keepPreviousData,
	});
}

export function useUpdateSettings() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body: SettingsPatch) => updateSettings(body),
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["settings"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
			// Turning copy-forward on can fill the open month.
			void client.invalidateQueries({ queryKey: ["budgets"] });
			// Safety buffer, payback day, and strategy move the projection and payoff months.
			void client.invalidateQueries({ queryKey: ["forecast"] });
			void client.invalidateQueries({ queryKey: ["goals"] });
		},
	});
}
