import { GripVertical } from "lucide-react";
import type { DragEvent, KeyboardEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
	cardName: string;
	onDragStart: () => void;
	onDragEnd: (isDropped: boolean) => void;
	onMove: (delta: number) => void;
};

const KEY_DELTAS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** Grip that drags its whole card; Arrow Up and Down move the card one place from the keyboard. */
export function CardDragHandle({ cardName, onDragStart, onDragEnd, onMove }: Props) {
	function startDrag(event: DragEvent<HTMLButtonElement>) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", cardName);
		const card = event.currentTarget.closest("li");
		if (card) {
			const box = card.getBoundingClientRect();
			event.dataTransfer.setDragImage(card, event.clientX - box.left, event.clientY - box.top);
		}
		onDragStart();
	}

	function moveWithKeys(event: KeyboardEvent<HTMLButtonElement>) {
		const delta = KEY_DELTAS[event.key];
		if (delta === undefined) return;
		event.preventDefault();
		const grip = event.currentTarget;
		onMove(delta);
		// React moves the card's DOM node when it goes down, which drops focus; take it back.
		requestAnimationFrame(() => grip.focus());
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					draggable
					aria-label={`Reorder ${cardName}`}
					onDragStart={startDrag}
					onDragEnd={(event) => onDragEnd(event.dataTransfer.dropEffect !== "none")}
					onKeyDown={moveWithKeys}
					className="flex shrink-0 cursor-grab items-center self-stretch rounded-l-xl pr-1 pl-2 text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
				>
					<GripVertical aria-hidden className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="left">Drag, or press ↑ ↓, to reorder</TooltipContent>
		</Tooltip>
	);
}
