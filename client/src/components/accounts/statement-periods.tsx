import type * as React from "react";
import { useState } from "react";
import { StatementPeriodHeader } from "@/components/accounts/statement-period-header";
import { StatementPeriodRow } from "@/components/accounts/statement-period-row";
import { useStatementPeriod } from "@/hooks/use-liabilities";

type Props = {
	accountId: string;
	currency: string;
	/** Shown beside the heading, such as Import statement on a manual card. */
	action?: React.ReactNode;
};

/** The card's Transactions grouped by Statement period, one period at a time. */
export function StatementPeriods({ accountId, currency, action }: Props) {
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
			{action ? <div className="flex justify-end">{action}</div> : null}
			<StatementPeriodHeader period={data} currency={currency} onSelect={setPeriodEnd} />
			{data.transactions.length === 0 ? (
				<p className="text-muted-foreground">No charges in this period.</p>
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border">
					{data.transactions.map((row) => (
						<StatementPeriodRow key={row.id} item={row} />
					))}
				</ul>
			)}
		</section>
	);
}
