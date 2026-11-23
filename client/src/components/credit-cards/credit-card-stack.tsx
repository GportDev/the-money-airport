import { Accordion } from "radix-ui";
import { toast } from "sonner";
import { CardDragHandle } from "@/components/credit-cards/card-drag-handle";
import { CreditCardTile } from "@/components/credit-cards/credit-card-tile";
import { useReorderCreditCards } from "@/hooks/use-credit-cards";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { CreditCard } from "@/types";

type Props = {
	cards: CreditCard[];
	selectedId: string;
	onSelect: (id: string) => void;
};

/** The User's cards as a reorderable accordion; one card is always open. */
export function CreditCardStack({ cards, selectedId, onSelect }: Props) {
	const reorder = useReorderCreditCards();
	const drag = useDragReorder(
		cards.map((card) => card.id),
		(ids) => reorder(ids, () => toast.error("Could not save the card order")),
	);
	const byId = new Map(cards.map((card) => [card.id, card]));

	return (
		<Accordion.Root
			type="single"
			value={selectedId}
			onValueChange={(id) => {
				if (id) onSelect(id);
			}}
			asChild
		>
			<ul
				aria-label="Credit cards"
				className="flex flex-col gap-3"
				onDragOver={(event) => {
					if (drag.draggingId) event.preventDefault();
				}}
				onDrop={(event) => {
					event.preventDefault();
					drag.finish(true);
				}}
			>
				{drag.order.map((id) => {
					const card = byId.get(id);
					if (!card) return null;
					return (
						<CreditCardTile
							key={id}
							card={card}
							isSelected={id === selectedId}
							isDragging={id === drag.draggingId}
							onDragOver={(isAfter) => drag.moveOver(id, isAfter)}
							handle={
								<CardDragHandle
									cardName={card.name}
									onDragStart={() => drag.start(id)}
									onDragEnd={drag.finish}
									onMove={(delta) => drag.nudge(id, delta)}
								/>
							}
						/>
					);
				})}
			</ul>
		</Accordion.Root>
	);
}
