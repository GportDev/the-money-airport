import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
			<Button
				variant="outline"
				type="button"
				disabled={isBusy}
				onClick={() => void onAddFromCategories()}
			>
				Add from categories
			</Button>
			<Button
				variant="outline"
				type="button"
				disabled={isBusy}
				onClick={() => void onAddFromRecurring()}
			>
				Add from recurring
			</Button>
		</>
	);
}
