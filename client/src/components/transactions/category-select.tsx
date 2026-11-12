import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useCategories } from "../../hooks/use-categories";
import { useUpdateTransaction } from "../../hooks/use-transactions";
import { cn } from "../../lib/cn";
import type { Category, TransactionListItem } from "../../types";
import { CategoryIcon } from "./category-icon";

const GROUPS: { kind: Category["kind"]; label: string }[] = [
	{ kind: "expense", label: "Expenses" },
	{ kind: "income", label: "Income" },
];

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
	const categories = useCategories();
	const update = useUpdateTransaction();
	const saved = category?.id ?? null;
	const [value, setValue] = useState<string | null>(saved);
	// Follow the server when the row is refetched with a different Category.
	const [lastSaved, setLastSaved] = useState(saved);
	if (saved !== lastSaved) {
		setLastSaved(saved);
		setValue(saved);
	}

	const list = categories.data ?? [];
	const byId = new Map(list.map((item) => [item.id, item]));
	const shown = (value ? byId.get(value) : undefined) ?? category;

	return (
		<Select.Root
			value={value}
			onValueChange={(next) => {
				if (!next || next === value) return;
				const previous = value;
				setValue(next);
				update.mutate(
					{ id: transactionId, categoryId: next },
					{ onError: () => setValue(previous) },
				);
			}}
			items={list.map((item) => ({ value: item.id, label: item.name }))}
		>
			<Select.Trigger
				aria-label={label}
				className={cn(
					"-mx-1.5 flex min-w-0 max-w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-foreground/5",
					className,
				)}
			>
				<Select.Value className="flex min-w-0 items-center gap-2">
					{() =>
						shown ? (
							<>
								<CategoryIcon icon={shown.icon} color={shown.color} />
								<span className="truncate">{shown.name}</span>
							</>
						) : (
							<span className="text-muted-foreground">Choose…</span>
						)
					}
				</Select.Value>
				<Select.Icon className="shrink-0 text-muted-foreground">
					<ChevronDown aria-hidden className="size-3.5" />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner
					alignItemWithTrigger={false}
					side="bottom"
					align="start"
					sideOffset={4}
					className="z-50 outline-none"
				>
					<Select.Popup className="max-h-[min(24rem,var(--available-height))] min-w-48 origin-[var(--transform-origin)] overflow-y-auto rounded-lg border border-border bg-card p-1 text-sm shadow-lg transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
						{GROUPS.map((group) => {
							const items = list.filter((item) => item.kind === group.kind);
							if (items.length === 0) return null;
							return (
								<Select.Group key={group.kind} className="py-1">
									<Select.GroupLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">
										{group.label}
									</Select.GroupLabel>
									{items.map((item) => (
										<Select.Item
											key={item.id}
											value={item.id}
											className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-[highlighted]:bg-foreground/5"
										>
											<CategoryIcon icon={item.icon} color={item.color} />
											<Select.ItemText className="flex-1 truncate">{item.name}</Select.ItemText>
											<Select.ItemIndicator>
												<Check aria-hidden className="size-3.5" />
											</Select.ItemIndicator>
										</Select.Item>
									))}
								</Select.Group>
							);
						})}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}
