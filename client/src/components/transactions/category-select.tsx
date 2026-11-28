import { useState } from "react";
import { toast } from "sonner";
import { CreateCategoryDrawer } from "@/components/drawers/create-category-drawer";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { useUpdateTransaction } from "@/hooks/use-transactions";
import { cn } from "@/lib/cn";
import type { TransactionListItem } from "@/types";

/**
 * Inline Category picker for a transaction row. Picking a Category saves it straight away
 * (and locks it, so sync never overwrites the choice); the row shows the new one at once and
 * goes back if the save fails. Typing a name that does not exist offers to create it.
 */
export function CategorySelect({
	transactionId,
	category,
	label,
	className,
	onSaved,
}: {
	transactionId: string;
	category: TransactionListItem["category"];
	label: string;
	className?: string;
	onSaved?: () => void;
}) {
	const update = useUpdateTransaction();
	const saved = category?.id ?? null;
	const [value, setValue] = useState<string | null>(saved);
	const [newCategoryName, setNewCategoryName] = useState<string | null>(null);
	// Follow the server when the row is refetched with a different Category.
	const [lastSaved, setLastSaved] = useState(saved);
	if (saved !== lastSaved) {
		setLastSaved(saved);
		setValue(saved);
	}

	function saveCategory(next: string) {
		const previous = value;
		setValue(next);
		update.mutate(
			{ id: transactionId, categoryId: next },
			{
				onSuccess: onSaved,
				onError: (error) => {
					setValue(previous);
					toast.error(error.message || "Could not change the Category");
				},
			},
		);
	}

	return (
		<>
			<CategoryCombobox
				aria-label={label}
				value={value}
				fallback={category}
				onValueChange={saveCategory}
				onCreate={setNewCategoryName}
				className={cn(
					"max-w-full rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/5 data-[popup-open]:bg-foreground/5",
					className,
				)}
			/>
			{newCategoryName !== null ? (
				<CreateCategoryDrawer
					name={newCategoryName}
					onCreated={(created) => saveCategory(created.id)}
					onClose={() => setNewCategoryName(null)}
				/>
			) : null}
		</>
	);
}
