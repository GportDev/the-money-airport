import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getCardPresets,
	getCreditCards,
	removeCardProduct,
	reorderCreditCards,
	setCardProduct,
} from "@/api/credit-cards";
import { invalidateLedger } from "@/lib/invalidate";
import { orderedBy } from "@/lib/reorder";
import type { CreditCard } from "@/types";

const CARDS_STALE_TIME = 5 * 60 * 1000;
const PRESETS_STALE_TIME = 30 * 60 * 1000;
const CARDS_KEY = ["credit-cards"];

export function useCreditCards() {
	return useQuery({
		queryKey: CARDS_KEY,
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

/**
 * Saves a new card order. The cached list takes the order at once, before the request, so a
 * dropped card never jumps back for a frame; a failed save restores the old order.
 */
export function useReorderCreditCards() {
	const client = useQueryClient();
	// One scope runs saves in order, so quick moves cannot land out of order.
	const { mutate } = useMutation({
		mutationFn: reorderCreditCards,
		scope: { id: "credit-card-order" },
	});

	return (accountIds: string[], onError: (error: Error) => void) => {
		const previous = client.getQueryData<CreditCard[]>(CARDS_KEY);
		void client.cancelQueries({ queryKey: CARDS_KEY, exact: true });
		client.setQueryData<CreditCard[]>(CARDS_KEY, (cards) => cards && orderedBy(cards, accountIds));
		mutate(accountIds, {
			onError: (error) => {
				client.setQueryData(CARDS_KEY, previous);
				onError(error);
			},
		});
	};
}
