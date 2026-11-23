import { useState } from "react";
import { StatementPeriodHeader } from "@/components/accounts/statement-period-header";
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
	return (
		<section aria-label="Statement periods" className="flex flex-col gap-2 text-sm">
			<StatementPeriodHeader period={data} currency={currency} onSelect={setPeriodEnd} />
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
