import { useState } from "react";
import { LiabilityCard } from "@/components/debt/liability-card";
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
	const ids = liabilities.map((entry) => entry.account.id);
	if (liabilities.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No cards or loans in the debt plan.
			</p>
		);
	}
	return (
		<ul aria-label="Debt plan" className="flex flex-col gap-2">
			{liabilities.map((liability, index) => (
				<li
					key={liability.account.id}
					draggable
					onDragStart={() => setDragIndex(index)}
					onDragOver={(event) => event.preventDefault()}
					onDrop={() => {
						if (dragIndex !== null && dragIndex !== index) onReorder(moved(ids, dragIndex, index));
						setDragIndex(null);
					}}
					className={dragIndex === index ? "opacity-60" : undefined}
				>
					<LiabilityCard
						liability={liability}
						currency={currency}
						canMoveUp={index > 0}
						canMoveDown={index < liabilities.length - 1}
						onMove={(delta) => onReorder(moved(ids, index, index + delta))}
						onOpen={() => onOpen(liability)}
					/>
				</li>
			))}
		</ul>
	);
}
