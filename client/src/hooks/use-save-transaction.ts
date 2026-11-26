import { toast } from "sonner";
import type { TransactionUpdateInput } from "@/api/transactions";
import { useUpdateTransaction } from "@/hooks/use-transactions";

/** Saves one changed field of a Transaction right away (the drawer autosaves per field). */
export function useSaveTransaction(id: string) {
	const update = useUpdateTransaction();
	return {
		/** For inline text fields: they show the toast and revert themselves when this throws. */
		saveOrThrow: (body: TransactionUpdateInput) => update.mutateAsync({ id, ...body }),
		/** For pickers: a failed save shows a toast; the picker follows the refetched value. */
		save: (body: TransactionUpdateInput) =>
			update.mutate({ id, ...body }, { onError: () => toast.error("Could not save. Try again.") }),
	};
}
