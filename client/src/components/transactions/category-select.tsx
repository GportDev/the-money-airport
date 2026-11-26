import { useState } from "react";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { useUpdateTransaction } from "@/hooks/use-transactions";
import { cn } from "@/lib/cn";
import type { TransactionListItem } from "@/types";

/**
 * Inline Category picker for a transaction row. Picking a Category saves it straight away
 * (and locks it, so sync never overwrites the choice); the row shows the new one at once and
 * goes back if the save fails.
 */
export function CategorySelect({
	transactionId,
	category,
	label,
	className,
}: {
	transactionId: string;
	category: TransactionListItem["category"];
	label: string;
	className?: string;
}) {
	const update = useUpdateTransaction();
	const saved = category?.id ?? null;
	const [value, setValue] = useState<string | null>(saved);
	// Follow the server when the row is refetched with a different Category.
	const [lastSaved, setLastSaved] = useState(saved);
	if (saved !== lastSaved) {
		setLastSaved(saved);
		setValue(saved);
	}

	return (
		<CategoryCombobox
			aria-label={label}
			value={value}
			fallback={category}
			onValueChange={(next) => {
				const previous = value;
				setValue(next);
				update.mutate(
					{ id: transactionId, categoryId: next },
					{ onError: () => setValue(previous) },
				);
			}}
			className={cn(
				"max-w-full rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/5 data-[popup-open]:bg-foreground/5",
				className,
			)}
		/>
	);
}
