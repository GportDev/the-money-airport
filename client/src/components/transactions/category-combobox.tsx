import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";

/** The "Create “name”" entry offered when the typed name matches no Category. */
type CreateOption = { kind: "create"; id: string; name: string };
type Option = Category | CreateOption;
type OptionGroup = { value: string; items: Option[] };

const CREATE_GROUP = "Create";

type Props = {
	value: string | null;
	onValueChange: (categoryId: string) => void;
	/** Lets a `<label htmlFor>` name the trigger. */
	id?: string;
	"aria-label"?: string;
	/** Shown in the trigger while the Categories load or the value is unknown. */
	fallback?: Pick<Category, "name" | "icon" | "color"> | null;
	className?: string;
	/** Offers to create a Category from the typed name. Without it, the list only filters. */
	onCreate?: (name: string) => void;
};

function groupCategories(categories: Category[]): OptionGroup[] {
	return [
		{ value: "Expenses", items: categories.filter((item) => item.kind === "expense") },
		{ value: "Income", items: categories.filter((item) => item.kind === "income") },
		{ value: "Transfers", items: categories.filter((item) => item.kind === "transfer") },
	].filter((group) => group.items.length > 0);
}

function isNewName(categories: Category[], query: string) {
	const name = query.trim().toLocaleLowerCase();
	return name !== "" && !categories.some((item) => item.name.toLocaleLowerCase() === name);
}

function optionGroups(categories: Category[], query: string, canCreate: boolean) {
	const groups = groupCategories(categories);
	if (!canCreate || !isNewName(categories, query)) return groups;
	const name = query.trim();
	const create: CreateOption = { kind: "create", id: `create:${name}`, name };
	return [...groups, { value: CREATE_GROUP, items: [create] }];
}

/** Category picker with a search box: typing narrows the list by name. */
export function CategoryCombobox({
	value,
	onValueChange,
	id,
	"aria-label": ariaLabel,
	fallback,
	className,
	onCreate,
}: Props) {
	const [query, setQuery] = useState("");
	const categories = useCategories();
	const list = categories.data ?? [];
	const selected = list.find((item) => item.id === value) ?? null;
	const shown = selected ?? fallback ?? null;

	return (
		<Combobox.Root<Option>
			items={optionGroups(list, query, Boolean(onCreate))}
			value={selected}
			onInputValueChange={setQuery}
			onValueChange={(next) => {
				if (!next) return;
				if (next.kind === "create") onCreate?.(next.name);
				else if (next.id !== value) onValueChange(next.id);
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
							{(group: OptionGroup) => (
								<Combobox.Group key={group.value} items={group.items} className="py-1">
									{group.value === CREATE_GROUP ? null : (
										<Combobox.GroupLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">
											{group.value}
										</Combobox.GroupLabel>
									)}
									<Combobox.Collection>
										{(item: Option) =>
											item.kind === "create" ? (
												<Combobox.Item
													key={item.id}
													value={item}
													className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-primary outline-none transition-colors select-none data-[highlighted]:bg-foreground/5"
												>
													<Plus aria-hidden className="size-4 shrink-0" />
													<span className="flex-1 truncate">Create “{item.name}”</span>
												</Combobox.Item>
											) : (
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
											)
										}
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
