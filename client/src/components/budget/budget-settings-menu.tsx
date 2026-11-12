import { Check, Settings } from "lucide-react";
import { DropdownMenu } from "radix-ui";

type Props = {
	isCopyForward: boolean;
	onCopyPrevious: () => void;
	onCopyForwardChange: (next: boolean) => void;
};

export function BudgetSettingsMenu({ isCopyForward, onCopyPrevious, onCopyForwardChange }: Props) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				aria-label="Budget settings"
				className="rounded-md border border-border p-2 transition-colors hover:bg-foreground/5 data-[state=open]:bg-foreground/5"
			>
				<Settings aria-hidden className="size-4" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={6}
					className="z-50 min-w-60 rounded-lg border border-border bg-card p-1 text-sm shadow-lg"
				>
					<DropdownMenu.Item
						className="cursor-default rounded-md px-2 py-2 outline-none data-[highlighted]:bg-foreground/5"
						onSelect={onCopyPrevious}
					>
						Copy from previous month
					</DropdownMenu.Item>
					<DropdownMenu.CheckboxItem
						className="flex cursor-default items-center gap-2 rounded-md px-2 py-2 outline-none data-[highlighted]:bg-foreground/5"
						checked={isCopyForward}
						onCheckedChange={onCopyForwardChange}
					>
						<span className="flex size-4 items-center justify-center">
							<DropdownMenu.ItemIndicator>
								<Check aria-hidden className="size-4" />
							</DropdownMenu.ItemIndicator>
						</span>
						Copy forward each month
					</DropdownMenu.CheckboxItem>
					<p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">
						Copies plans into a new month with none. No rollover.
					</p>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
