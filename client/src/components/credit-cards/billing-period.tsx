import { useState } from "react";
import { StatementPeriodHeader } from "@/components/accounts/statement-period-header";
import { BillingPeriodRow } from "@/components/credit-cards/billing-period-row";
import { QueryError } from "@/components/ui/query-error";
import { SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";
import { useStatementPeriod } from "@/hooks/use-liabilities";

const OPEN_PERIOD = "open";

type Props = {
	accountId: string;
	currency: string;
};

/** The card's Transactions one billing period at a time, starting on the open period. */
export function BillingPeriod({ accountId, currency }: Props) {
	const [periodEnd, setPeriodEnd] = useState(OPEN_PERIOD);
	const period = useStatementPeriod(accountId, periodEnd);
	const data = period.data;

	function content() {
		if (period.isError) {
			return (
				<QueryError
					message="Could not load the billing period."
					isRetrying={period.isFetching}
					onRetry={() => void period.refetch()}
				/>
			);
		}
		if (!data) {
			return (
				<SkeletonGroup label="Loading billing period">
					<SkeletonRows count={3} />
				</SkeletonGroup>
			);
		}
		return (
			<>
				<StatementPeriodHeader period={data} currency={currency} onSelect={setPeriodEnd} />
				{data.transactions.length === 0 ? (
					<p className="text-muted-foreground">No charges in this period.</p>
				) : (
					<ul
						aria-label="Billing period transactions"
						className="divide-y divide-border rounded-lg border border-border"
					>
						{data.transactions.map((item) => (
							<BillingPeriodRow key={item.id} item={item} />
						))}
					</ul>
				)}
			</>
		);
	}

	return (
		<section
			aria-label="Billing period"
			className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm"
		>
			<h2 className="font-semibold">Billing period</h2>
			{content()}
		</section>
	);
}
