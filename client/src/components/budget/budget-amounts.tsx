import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

type Props = {
	planned: number;
	actual: number;
	remaining: number;
	currency: string;
	className?: string;
};

/** Planned, Actual, Remaining columns; Remaining turns red when negative. */
export function BudgetAmounts({ planned, actual, remaining, currency, className }: Props) {
	const remainingText =
		remaining < 0 ? `-${formatMoney(-remaining, currency)}` : formatMoney(remaining, currency);
	return (
		<span className={cn("grid shrink-0 grid-cols-3 gap-3 text-right text-sm sm:w-80", className)}>
			<Amount>{formatMoney(planned, currency)}</Amount>
			<Amount className="text-muted-foreground">{formatMoney(actual, currency)}</Amount>
			<Amount className={cn(remaining < 0 && "text-negative")}>{remainingText}</Amount>
		</span>
	);
}
