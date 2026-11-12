import { BudgetProgress } from "@/components/budget/budget-progress";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";

type Props = {
	label: string;
	planned: number;
	actual: number;
	isOver: boolean;
	currency: string;
};

/** "Label · $actual of $planned" over a progress bar, as on the Dashboard widget. */
export function BudgetBar({ label, planned, actual, isOver, currency }: Props) {
	return (
		<li className="flex flex-col gap-1.5 text-sm">
			<div className="flex items-baseline justify-between gap-2">
				<span>{label}</span>
				<Amount className="text-muted-foreground">
					{formatMoney(actual, currency)} of {formatMoney(planned, currency)}
				</Amount>
			</div>
			<BudgetProgress
				label={`${label} budget used`}
				planned={planned}
				actual={actual}
				isOver={isOver}
			/>
		</li>
	);
}
