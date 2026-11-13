import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/api/settings";

export function useSettings() {
	return useQuery({
		queryKey: ["settings"],
		queryFn: getSettings,
		staleTime: 30 * 60 * 1000,
	});
}

export function useUpdateBaseCurrency() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (currency: string) => updateSettings({ currency }),
		// Every total is converted into the base currency, so all cached amounts are stale.
		onSuccess: () => client.invalidateQueries(),
	});
}
