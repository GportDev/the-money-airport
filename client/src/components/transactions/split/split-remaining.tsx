import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

type Props = { total: number; remaining: number; currency: string };

/** How much of the total is left to assign, or how far the parts go over it. */
export function SplitRemaining({ total, remaining, currency }: Props) {
	const isOver = remaining < 0;
	return (
		<output className="flex justify-between gap-2 border-t border-border pt-2 text-muted-foreground">
			<span>
				Total <Amount className="text-foreground">{formatMoney(Math.abs(total), currency)}</Amount>
			</span>
			<span
				className={cn(
					"transition-colors duration-150 ease-out",
					remaining === 0 && "text-positive",
					isOver && "text-negative",
				)}
			>
				{remaining === 0 ? "Adds up" : isOver ? "Over by " : "Left "}
				{remaining === 0 ? null : <Amount>{formatMoney(Math.abs(remaining), currency)}</Amount>}
			</span>
		</output>
	);
}
