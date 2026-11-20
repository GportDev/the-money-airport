import { type FormEvent, useState } from "react";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useBulkCategorize } from "@/hooks/use-transactions";

export function BulkCategorizeDrawer({
	transactionIds,
	onClose,
	onDone,
}: {
	transactionIds: string[];
	onClose: () => void;
	onDone: () => void;
}) {
	const bulk = useBulkCategorize();
	const { sheet, close } = useSheetClose(onClose);
	const [categoryId, setCategoryId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const count = transactionIds.length;

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (!categoryId) {
			setError("Pick a Category.");
			return;
		}
		try {
			await bulk.mutateAsync({ ids: transactionIds, categoryId });
			close(onDone);
		} catch {
			setError("Could not update. Try again.");
		}
	}

	return (
		<Sheet {...sheet}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit {count === 1 ? "1 transaction" : `${count} transactions`}</SheetTitle>
					<SheetDescription>Assign one Category to every selected transaction.</SheetDescription>
				</SheetHeader>
				<form className="flex flex-col gap-3 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="bulk-category">
						Category
						<CategoryCombobox
							id="bulk-category"
							value={categoryId || null}
							onValueChange={setCategoryId}
							className="rounded-md border border-border bg-card px-3 py-2 hover:border-foreground/30"
						/>
					</label>
					{error ? (
						<p role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
					<button
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 transition-colors hover:bg-primary/85"
						type="submit"
						disabled={bulk.isPending}
					>
						Apply
					</button>
				</form>
			</SheetContent>
		</Sheet>
	);
}
