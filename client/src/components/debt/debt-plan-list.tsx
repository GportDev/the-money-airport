import { useState } from "react";
import { LiabilityCard } from "@/components/debt/liability-card";
import { useOptimisticValue } from "@/hooks/use-optimistic-value";
import { transitionName, withViewTransition } from "@/lib/view-transition";
import type { DebtLiability } from "@/types";

type Props = {
	liabilities: DebtLiability[];
	currency: string;
	onReorder: (ids: string[]) => void;
	onOpen: (liability: DebtLiability) => void;
};

function moved(ids: string[], from: number, to: number) {
	const next = [...ids];
	const [item] = next.splice(from, 1);
	if (item) next.splice(to, 0, item);
	return next;
}

/** In-plan liabilities in Payback order; dragging or moving one saves a custom order. */
export function DebtPlanList({ liabilities, currency, onReorder, onOpen }: Props) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const saved = useOptimisticValue(liabilities.map((entry) => entry.account.id).join(","));
	const ids = saved.value.split(",").filter(Boolean);
	const ordered = ids
		.map((id) => liabilities.find((entry) => entry.account.id === id))
		.filter((entry): entry is DebtLiability => entry !== undefined);

	/** Pointer moves glide to their new place; keyboard moves stay instant. */
	function reorder(next: string[], isKeyboard: boolean) {
		const apply = () => saved.setValue(next.join(","));
		if (isKeyboard) apply();
		else withViewTransition(apply);
		onReorder(next);
	}

	if (liabilities.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No cards or loans in the debt plan.
			</p>
		);
	}
	return (
		<ul aria-label="Debt plan" className="flex flex-col gap-2">
			{ordered.map((liability, index) => (
				<li
					key={liability.account.id}
					// Each card needs its own transition name so it can glide; names are per id.
					style={{ viewTransitionName: transitionName("debt", liability.account.id) }}
					draggable
					onDragStart={() => setDragIndex(index)}
					onDragOver={(event) => event.preventDefault()}
					onDrop={() => {
						if (dragIndex !== null && dragIndex !== index)
							reorder(moved(ids, dragIndex, index), false);
						setDragIndex(null);
					}}
					className={dragIndex === index ? "opacity-60" : undefined}
				>
					<LiabilityCard
						liability={liability}
						currency={currency}
						canMoveUp={index > 0}
						canMoveDown={index < ordered.length - 1}
						onMove={(delta, isKeyboard) => reorder(moved(ids, index, index + delta), isKeyboard)}
						onOpen={() => onOpen(liability)}
					/>
				</li>
			))}
		</ul>
	);
}
