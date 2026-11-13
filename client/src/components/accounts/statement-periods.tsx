import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { useStatementPeriod } from "@/hooks/use-liabilities";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";

type Props = {
	accountId: string;
	currency: string;
};

/** The card's Transactions grouped by Statement period, one period at a time. */
export function StatementPeriods({ accountId, currency }: Props) {
	const [periodEnd, setPeriodEnd] = useState<string | undefined>(undefined);
	const period = useStatementPeriod(accountId, periodEnd);
	const data = period.data;
	if (period.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load the statement period.
			</p>
		);
	}
	if (!data) return null;
	const label = `${shortDate(data.periodStart)} – ${shortDate(data.periodEnd)}${
		data.statement?.dueDate
			? ` · due ${shortDate(data.statement.dueDate)}`
			: data.statement
				? ""
				: " · open"
	}`;
	return (
		<section aria-label="Statement periods" className="flex flex-col gap-2 text-sm">
			<div className="flex items-center gap-1">
				<button
					type="button"
					aria-label="Previous statement"
					disabled={!data.previousPeriodEnd}
					onClick={() => setPeriodEnd(data.previousPeriodEnd ?? undefined)}
					className="rounded-md p-1.5 transition-colors hover:bg-foreground/5 disabled:opacity-40"
				>
					<ChevronLeft aria-hidden className="size-4" />
				</button>
				<p className="flex-1 text-center font-medium" aria-live="polite">
					{label}
				</p>
				<button
					type="button"
					aria-label="Next statement"
					disabled={!data.nextPeriodEnd}
					onClick={() => setPeriodEnd(data.nextPeriodEnd ?? undefined)}
					className="rounded-md p-1.5 transition-colors hover:bg-foreground/5 disabled:opacity-40"
				>
					<ChevronRight aria-hidden className="size-4" />
				</button>
			</div>
			<p className="flex justify-between text-muted-foreground">
				<span>Period total</span>
				<Amount>{formatMoney(data.total, currency)}</Amount>
			</p>
			{data.transactions.length === 0 ? (
				<p className="text-muted-foreground">No charges in this period.</p>
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border">
					{data.transactions.map((row) => (
						<li key={row.id} className="flex justify-between gap-2 px-3 py-1.5">
							<span className="truncate">
								<span className="text-muted-foreground">{shortDate(row.date)}</span> {row.name}
							</span>
							<Amount>{formatMoney(row.amount, row.isoCurrencyCode)}</Amount>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
