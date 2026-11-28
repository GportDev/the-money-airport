import { ChevronLeft, ChevronRight } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import type { StatementPeriod } from "@/types";

type Props = {
	period: StatementPeriod;
	currency: string;
	onSelect: (periodEnd: string) => void;
};

function periodLabel(period: StatementPeriod) {
	const range = `${shortDate(period.periodStart)} – ${shortDate(period.periodEnd)}`;
	const { statement } = period;
	if (!statement) return `${range} · open`;
	const due = statement.dueDate ? ` · due ${shortDate(statement.dueDate)}` : "";
	return `${range}${due}${statement.source === "import" ? " · imported" : ""}`;
}

/** Steps between a card's Statement periods and shows the period's dates and total. */
export function StatementPeriodHeader({ period, currency, onSelect }: Props) {
	const { previousPeriodEnd, nextPeriodEnd } = period;
	return (
		<>
			<div className="flex items-center gap-1">
				<button
					type="button"
					aria-label="Previous statement"
					disabled={!previousPeriodEnd}
					onClick={() => previousPeriodEnd && onSelect(previousPeriodEnd)}
					className="rounded-md p-1.5 transition-colors hover:bg-foreground/5 disabled:opacity-40"
				>
					<ChevronLeft aria-hidden className="size-4" />
				</button>
				<p className="flex-1 text-center font-medium" aria-live="polite">
					{periodLabel(period)}
				</p>
				<button
					type="button"
					aria-label="Next statement"
					disabled={!nextPeriodEnd}
					onClick={() => nextPeriodEnd && onSelect(nextPeriodEnd)}
					className="rounded-md p-1.5 transition-colors hover:bg-foreground/5 disabled:opacity-40"
				>
					<ChevronRight aria-hidden className="size-4" />
				</button>
			</div>
			<p className="flex justify-between text-muted-foreground">
				<span>Period total</span>
				<Amount>{formatMoney(period.total, currency)}</Amount>
			</p>
		</>
	);
}
