import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { FundSummary } from "@/types";

type Props = {
	funds: FundSummary[];
	unassigned: number;
	/** Native host currency. */
	currency: string;
};

/** A host's Funds and what is left Unassigned; negative Unassigned reads as a warning. */
export function FundBalanceList({ funds, unassigned, currency }: Props) {
	const isOverAssigned = unassigned < 0;
	return (
		<ul className="flex flex-col text-sm">
			{funds.map((fund) => (
				<li key={fund.goalId} className="flex justify-between gap-2 py-1">
					<span className="truncate">{fund.name}</span>
					<Amount>{formatMoney(fund.balance, currency)}</Amount>
				</li>
			))}
			<li
				className={cn(
					"flex justify-between gap-2 border-t border-border py-1",
					isOverAssigned ? "text-negative" : "text-muted-foreground",
				)}
			>
				<span>Unassigned</span>
				<Amount>{formatMoney(unassigned, currency)}</Amount>
			</li>
			{isOverAssigned ? (
				<li role="alert" className="text-xs text-negative">
					Funds add up to more than this account holds.
				</li>
			) : null}
		</ul>
	);
}
