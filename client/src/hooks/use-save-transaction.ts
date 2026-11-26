import { toast } from "sonner";
import type { TransactionUpdateInput } from "@/api/transactions";
import { useUpdateTransaction } from "@/hooks/use-transactions";

/** Saves one changed field of a Transaction right away (the drawer autosaves per field). */
export function useSaveTransaction(id: string, onSaved?: () => void) {
	const update = useUpdateTransaction();
	return {
		/** For inline text fields: they show the toast and revert themselves when this throws. */
		saveOrThrow: async (body: TransactionUpdateInput) => {
			const saved = await update.mutateAsync({ id, ...body });
			onSaved?.();
			return saved;
		},
		/** For pickers: a failed save shows a toast; the picker follows the refetched value. */
		save: (body: TransactionUpdateInput) =>
			update.mutate(
				{ id, ...body },
				{ onSuccess: onSaved, onError: () => toast.error("Could not save. Try again.") },
			),
	};
}
