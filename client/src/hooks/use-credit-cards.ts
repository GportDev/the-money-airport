import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getCardPresets,
	getCreditCards,
	removeCardProduct,
	setCardProduct,
} from "@/api/credit-cards";
import { invalidateLedger } from "@/lib/invalidate";

const CARDS_STALE_TIME = 5 * 60 * 1000;
const PRESETS_STALE_TIME = 30 * 60 * 1000;

export function useCreditCards() {
	return useQuery({
		queryKey: ["credit-cards"],
		queryFn: getCreditCards,
		staleTime: CARDS_STALE_TIME,
	});
}

export function useCardPresets() {
	return useQuery({
		queryKey: ["credit-cards", "presets"],
		queryFn: getCardPresets,
		staleTime: PRESETS_STALE_TIME,
	});
}

/** Card benefits change Rewards earned and the Better card on every card Transaction. */
function useCardProductMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({ mutationFn: fn, onSuccess: () => invalidateLedger(client) });
}

export function useSetCardProduct() {
	return useCardProductMutation(setCardProduct);
}

export function useRemoveCardProduct() {
	return useCardProductMutation(removeCardProduct);
}
