import { toast } from "sonner";
import { useAddRowsFromCategories, useAddRowsFromRecurring } from "@/hooks/use-forecast";

function addedMessage(count: number) {
	return `Added ${count} item${count === 1 ? "" : "s"}`;
}

/** One-shot seeds for the year plan: Add from categories and Add from recurring (PRD F12.10). */
export function PlanSeedButtons({ year }: { year: number }) {
	const fromCategories = useAddRowsFromCategories();
	const fromRecurring = useAddRowsFromRecurring();
	const isBusy = fromCategories.isPending || fromRecurring.isPending;

	async function onAddFromCategories() {
		try {
			const created = await fromCategories.mutateAsync(year);
			if (created.length === 0) {
				toast.info("Every category is already on the plan");
				return;
			}
			toast.success(addedMessage(created.length));
		} catch (_error) {
			toast.error("Could not add items from categories");
		}
	}

	async function onAddFromRecurring() {
		try {
			const created = await fromRecurring.mutateAsync(year);
			if (created.length === 0) {
				toast.info("Every recurring bill is already on the plan");
				return;
			}
			toast.success(addedMessage(created.length));
		} catch (_error) {
			toast.error("Could not add items from recurring");
		}
	}

	return (
		<>
			<button
				type="button"
				disabled={isBusy}
				onClick={() => void onAddFromCategories()}
				className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				Add from categories
			</button>
			<button
				type="button"
				disabled={isBusy}
				onClick={() => void onAddFromRecurring()}
				className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				Add from recurring
			</button>
		</>
	);
}
