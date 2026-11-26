import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";

type CategoryGroup = { value: string; items: Category[] };

type Props = {
	value: string | null;
	onValueChange: (categoryId: string) => void;
	/** Lets a `<label htmlFor>` name the trigger. */
	id?: string;
	"aria-label"?: string;
	/** Shown in the trigger while the Categories load or the value is unknown. */
	fallback?: Pick<Category, "name" | "icon" | "color"> | null;
	className?: string;
};

function groupCategories(categories: Category[]): CategoryGroup[] {
	return [
		{ value: "Expenses", items: categories.filter((item) => item.kind === "expense") },
		{ value: "Income", items: categories.filter((item) => item.kind === "income") },
		{ value: "Transfers", items: categories.filter((item) => item.kind === "transfer") },
	].filter((group) => group.items.length > 0);
}

/** Category picker with a search box: typing narrows the list by name. */
export function CategoryCombobox({
	value,
	onValueChange,
	id,
	"aria-label": ariaLabel,
	fallback,
	className,
}: Props) {
	const categories = useCategories();
	const list = categories.data ?? [];
	const selected = list.find((item) => item.id === value) ?? null;
	const shown = selected ?? fallback ?? null;

	return (
		<Combobox.Root
			items={groupCategories(list)}
			value={selected}
			onValueChange={(next) => {
				if (next && next.id !== value) onValueChange(next.id);
			}}
			itemToStringLabel={(item) => item.name}
			isItemEqualToValue={(item, current) => item.id === current.id}
		>
			<Combobox.Trigger
				id={id}
				aria-label={ariaLabel}
				className={cn(
					"flex min-w-0 items-center gap-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
					className,
				)}
			>
				<span className="flex min-w-0 flex-1 items-center gap-2">
					{shown ? (
						<>
							<CategoryIcon icon={shown.icon} color={shown.color} />
							<span className="truncate">{shown.name}</span>
						</>
					) : (
						<span className="text-muted-foreground">Choose…</span>
					)}
				</span>
				<Combobox.Icon className="shrink-0 text-muted-foreground">
					<ChevronDown aria-hidden className="size-3.5" />
				</Combobox.Icon>
			</Combobox.Trigger>
			<Combobox.Portal>
				<Combobox.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
					{/* No exit transition: Base UI sometimes never finishes it here, which leaves an
					    invisible popup mounted over the page. */}
					<Combobox.Popup
						aria-label="Categories"
						className="flex max-h-[min(24rem,var(--available-height))] w-64 origin-(--transform-origin) flex-col overflow-hidden rounded-lg border border-border bg-card text-sm shadow-pop data-[open]:animate-pop-in"
					>
						<div className="flex items-center gap-2 border-b border-border px-3">
							<Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
							<Combobox.Input
								aria-label="Search categories"
								placeholder="Search categories"
								className="w-full bg-transparent py-2 outline-none placeholder:text-muted-foreground"
							/>
						</div>
						<Combobox.Empty className="px-3 py-2 text-muted-foreground empty:hidden">
							No categories match.
						</Combobox.Empty>
						<Combobox.List className="overflow-y-auto p-1 empty:hidden">
							{(group: CategoryGroup) => (
								<Combobox.Group key={group.value} items={group.items} className="py-1">
									<Combobox.GroupLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">
										{group.value}
									</Combobox.GroupLabel>
									<Combobox.Collection>
										{(item: Category) => (
											<Combobox.Item
												key={item.id}
												value={item}
												className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors select-none data-[highlighted]:bg-foreground/5"
											>
												<CategoryIcon icon={item.icon} color={item.color} />
												<span className="flex-1 truncate">{item.name}</span>
												<Combobox.ItemIndicator>
													<Check aria-hidden className="size-3.5" />
												</Combobox.ItemIndicator>
											</Combobox.Item>
										)}
									</Combobox.Collection>
								</Combobox.Group>
							)}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
}
