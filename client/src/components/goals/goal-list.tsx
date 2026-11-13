import { GoalCard } from "@/components/goals/goal-card";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { Goal, GoalType } from "@/types";

type Props = {
	type: GoalType;
	goals: Goal[];
	total: number;
	currency: string;
	onOpen: (goal: Goal) => void;
	onAdd: () => void;
};

const HEADINGS: Record<GoalType, { title: string; empty: string }> = {
	save_up: { title: "Save up", empty: "No save-up goals yet" },
	pay_down: { title: "Pay down", empty: "No pay-down goals yet" },
};

export function GoalList({ type, goals, total, currency, onOpen, onAdd }: Props) {
	const heading = HEADINGS[type];
	if (goals.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
				<p className="text-sm text-muted-foreground">{heading.empty}</p>
				<button
					type="button"
					onClick={onAdd}
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
				>
					Add your first goal
				</button>
			</div>
		);
	}
	return (
		<section aria-labelledby={`goals-${type}-heading`} className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between">
				<h2 id={`goals-${type}-heading`} className="text-sm font-medium text-muted-foreground">
					{heading.title}
				</h2>
				<Amount className="font-medium">{formatMoney(total, currency)}</Amount>
			</div>
			<ul className="flex flex-col gap-3">
				{goals.map((goal) => (
					<GoalCard key={goal.id} goal={goal} currency={currency} onOpen={onOpen} />
				))}
			</ul>
		</section>
	);
}
