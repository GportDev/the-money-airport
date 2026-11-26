import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useMerchants } from "@/hooks/use-transactions";
import { cn } from "@/lib/cn";

type Props = {
	value: string | null;
	onValueChange: (merchant: string) => void;
	/** Lets a `<label htmlFor>` name the trigger. */
	id?: string;
	className?: string;
};

/** Merchant picker: one of the merchants the User already has, or a new one typed in. */
export function MerchantCombobox({ value, onValueChange, id, className }: Props) {
	const merchants = useMerchants();
	const [query, setQuery] = useState("");
	const names = (merchants.data ?? []).map((merchant) => merchant.name);
	const typed = query.trim();
	const isNew = typed !== "" && !names.some((name) => name.toLowerCase() === typed.toLowerCase());
	const items = isNew ? [typed, ...names] : names;

	return (
		<Combobox.Root
			items={items}
			value={value}
			onValueChange={(next) => {
				if (next && next !== value) onValueChange(next);
			}}
			inputValue={query}
			onInputValueChange={setQuery}
		>
			<Combobox.Trigger
				id={id}
				className={cn(
					"flex min-w-0 items-center gap-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
					className,
				)}
			>
				<span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
					{value ?? "Choose…"}
				</span>
				<Combobox.Icon className="shrink-0 text-muted-foreground">
					<ChevronDown aria-hidden className="size-3.5" />
				</Combobox.Icon>
			</Combobox.Trigger>
			<Combobox.Portal>
				<Combobox.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
					{/* No exit transition, like CategoryCombobox: Base UI can leave it mounted. */}
					<Combobox.Popup
						aria-label="Merchants"
						className="flex max-h-[min(24rem,var(--available-height))] w-72 origin-(--transform-origin) flex-col overflow-hidden rounded-lg border border-border bg-card text-sm shadow-pop data-[open]:animate-pop-in"
					>
						<div className="flex items-center gap-2 border-b border-border px-3">
							<Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
							<Combobox.Input
								aria-label="Search merchants"
								placeholder="Search or add a merchant"
								className="w-full bg-transparent py-2 outline-none placeholder:text-muted-foreground"
							/>
						</div>
						<Combobox.Empty className="px-3 py-2 text-muted-foreground empty:hidden">
							Type a merchant name.
						</Combobox.Empty>
						<Combobox.List className="overflow-y-auto p-1 empty:hidden">
							{(item: string) => (
								<Combobox.Item
									key={item}
									value={item}
									className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors select-none data-[highlighted]:bg-foreground/5"
								>
									<span className="flex-1 truncate">
										{isNew && item === typed ? `Add “${item}”` : item}
									</span>
									<Combobox.ItemIndicator>
										<Check aria-hidden className="size-3.5" />
									</Combobox.ItemIndicator>
								</Combobox.Item>
							)}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
}
