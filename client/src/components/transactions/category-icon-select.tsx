import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/transactions/category-icon";

const ICON_KEYS = Object.keys(CATEGORY_ICONS);

/** "shopping-cart" reads as "Shopping cart". */
function iconLabel(key: string) {
	const words = key.replaceAll("-", " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}

type Props = {
	labelId: string;
	value: string;
	color: string;
	onValueChange: (icon: string) => void;
};

/** Icon picker that shows each icon beside its name, tinted with the Category color. */
export function CategoryIconSelect({ labelId, value, color, onValueChange }: Props) {
	return (
		<Select.Root
			value={value}
			onValueChange={(next) => {
				if (next) onValueChange(next);
			}}
			items={ICON_KEYS.map((key) => ({ value: key, label: iconLabel(key) }))}
		>
			<Select.Trigger
				aria-labelledby={labelId}
				className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-ring"
			>
				<Select.Value className="flex min-w-0 flex-1 items-center gap-2">
					{(key: string) => (
						<>
							<CategoryIcon icon={key} color={color} />
							<span className="truncate">{iconLabel(key)}</span>
						</>
					)}
				</Select.Value>
				<Select.Icon className="shrink-0 text-muted-foreground">
					<ChevronDown aria-hidden className="size-4" />
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
					<Select.Popup className="max-h-[min(20rem,var(--available-height))] min-w-(--anchor-width) origin-[var(--transform-origin)] overflow-y-auto rounded-lg border border-border bg-card p-1 text-sm shadow-lg transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
						{ICON_KEYS.map((key) => (
							<Select.Item
								key={key}
								value={key}
								className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-[highlighted]:bg-foreground/5"
							>
								<CategoryIcon icon={key} color={color} />
								<Select.ItemText className="flex-1 truncate">{iconLabel(key)}</Select.ItemText>
								<Select.ItemIndicator>
									<Check aria-hidden className="size-3.5" />
								</Select.ItemIndicator>
							</Select.Item>
						))}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}
