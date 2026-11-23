import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import type { DragEvent, ReactNode } from "react";
import { CardTileDetails } from "@/components/credit-cards/card-tile-details";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { CreditCard } from "@/types";

type Props = {
	card: CreditCard;
	isSelected: boolean;
	isDragging: boolean;
	/** The grip that reorders this card. */
	handle: ReactNode;
	/** A dragged card is over this one; `isAfter` when over its lower half. */
	onDragOver: (isAfter: boolean) => void;
};

/**
 * One card in the stack: its name and current balance, opening into the full details.
 * The open card is the selected one shown in the detail column.
 */
export function CreditCardTile({ card, isSelected, isDragging, handle, onDragOver }: Props) {
	const mask = card.mask ? ` …${card.mask}` : "";

	function dragOver(event: DragEvent<HTMLLIElement>) {
		event.preventDefault();
		const box = event.currentTarget.getBoundingClientRect();
		onDragOver(event.clientY > box.top + box.height / 2);
	}

	return (
		<Accordion.Item value={card.id} asChild>
			<li
				onDragOver={dragOver}
				className={cn(
					"rounded-xl border border-border text-sm transition-[background-color,opacity] duration-150",
					isSelected ? "bg-primary/5" : "bg-card hover:bg-foreground/5",
					isDragging && "opacity-40",
				)}
			>
				<div className="flex items-stretch">
					{handle}
					<Accordion.Header className="flex min-w-0 flex-1">
						<Accordion.Trigger className="group flex min-w-0 flex-1 items-center gap-3 rounded-r-xl py-3 pr-3 pl-1 text-left">
							<span className="min-w-0 flex-1 truncate font-medium">
								{card.name}
								<span className="font-normal text-muted-foreground">{mask}</span>
							</span>
							<Amount className="shrink-0 font-semibold">
								{formatMoney(card.currentBalance, card.isoCurrencyCode)}
							</Amount>
							<ChevronDown
								aria-hidden
								className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
							/>
						</Accordion.Trigger>
					</Accordion.Header>
				</div>
				<Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none">
					<CardTileDetails card={card} />
				</Accordion.Content>
			</li>
		</Accordion.Item>
	);
}
