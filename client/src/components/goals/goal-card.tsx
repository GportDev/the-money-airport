import { Link } from "react-router";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/format";
import { formatPercent } from "@/lib/goals";
import { monthLabel } from "@/lib/month";
import type { Goal } from "@/types";

type Props = {
	goal: Goal;
	currency: string;
	onOpen: (goal: Goal) => void;
};

export function GoalCard({ goal, currency, onOpen }: Props) {
	const percent = formatPercent(goal.percentComplete);
	return (
		<li className="rounded-xl border border-border bg-card">
			<button
				type="button"
				onClick={() => onOpen(goal)}
				className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-foreground/5"
			>
				<span className="flex items-center gap-3">
					<span className="flex size-9 items-center justify-center rounded-lg bg-muted">
						<CategoryIcon icon={goal.icon} color={goal.color} className="size-5" />
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="flex items-center gap-2">
							<span className="truncate font-medium">{goal.name}</span>
							<GoalStatusBadge status={goal.status} hasDate={goal.targetDate !== null} />
						</span>
						<span className="text-xs text-muted-foreground">
							{goal.targetDate ? monthLabel(...yearMonth(goal.targetDate)) : "No target date"}
							{goal.host ? ` · in ${goal.host.name}` : ""}
						</span>
					</span>
					<Amount className="font-medium">{formatMoney(goal.currentAmount, currency)}</Amount>
				</span>
				<Progress value={goal.percentComplete * 100} aria-label={`${goal.name} progress`} />
				<span className="text-xs text-muted-foreground">
					{percent} of {formatMoney(goal.targetAmount, currency)}
					{goal.type === "pay_down" ? " paid off" : ""}
				</span>
			</button>
			{goal.type === "pay_down" ? (
				<p className="flex justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
					<span>
						{goal.payoffMonth ? `Payoff ${goal.payoffMonth}` : "Payoff month after the Debt plan"}
					</span>
					<Link
						to="/forecast?tab=debt"
						className="text-foreground underline-offset-2 hover:underline"
					>
						See debt plan
					</Link>
				</p>
			) : null}
		</li>
	);
}

function yearMonth(isoDate: string): [number, number] {
	return [Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7))];
}
