import { useRef, useState } from "react";
import { isSameOrder, placeNear, shiftBy } from "@/lib/reorder";

type Drag = { id: string; order: string[] };

/**
 * Live reordering for a list dragged with native drag and drop, plus a keyboard nudge.
 * `onReorder` gets the new id order once, when a drag is dropped or a nudge lands.
 */
export function useDragReorder(ids: string[], onReorder: (ids: string[]) => void) {
	const [drag, setDrag] = useState<Drag | null>(null);
	// Drop and dragend both finish a drag; the ref lets the second call see the first.
	const dragRef = useRef<Drag | null>(null);

	function update(next: Drag | null) {
		dragRef.current = next;
		setDrag(next);
	}

	function start(id: string) {
		update({ id, order: ids });
	}

	function moveOver(targetId: string, isAfter: boolean) {
		const current = dragRef.current;
		if (!current || current.id === targetId) return;
		const order = placeNear(current.order, current.id, targetId, isAfter);
		if (!isSameOrder(order, current.order)) update({ ...current, order });
	}

	function finish(isDropped: boolean) {
		const current = dragRef.current;
		if (!current) return;
		update(null);
		if (isDropped && !isSameOrder(current.order, ids)) onReorder(current.order);
	}

	function nudge(id: string, delta: number) {
		const order = shiftBy(ids, id, delta);
		if (order !== ids) onReorder(order);
	}

	return {
		order: drag?.order ?? ids,
		draggingId: drag?.id ?? null,
		start,
		moveOver,
		finish,
		nudge,
	};
}
