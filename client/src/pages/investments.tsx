import { TrendingUp } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { AllocationChart } from "@/components/investments/allocation-chart";
import { InvestmentAccountList } from "@/components/investments/investment-account-list";
import { InvestmentRangeToggle } from "@/components/investments/investment-range-toggle";
import { InvestmentsSkeleton } from "@/components/investments/investments-skeleton";
import { PortfolioSummary } from "@/components/investments/portfolio-summary";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { useInvestments } from "@/hooks/use-investments";
import type { InvestmentRange } from "@/types";

function parseRange(value: string | null): InvestmentRange {
	return value === "3m" || value === "1y" ? value : "1m";
}

export function InvestmentsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const range = parseRange(searchParams.get("range"));
	const investments = useInvestments(range);
	const data = investments.data;

	function selectRange(next: InvestmentRange) {
		setSearchParams((current) => {
			const params = new URLSearchParams(current);
			if (next === "1m") params.delete("range");
			else params.set("range", next);
			return params;
		});
	}

	return (
		<>
			<PageHeader title="Investments">
				{data && data.accounts.length > 0 ? (
					<InvestmentRangeToggle value={range} onChange={selectRange} />
				) : null}
			</PageHeader>
			{investments.isError ? (
				<QueryError
					message="Could not load investments."
					isRetrying={investments.isFetching}
					onRetry={() => void investments.refetch()}
				/>
			) : !data ? (
				<InvestmentsSkeleton />
			) : data.accounts.length === 0 ? (
				<EmptyState
					icon={TrendingUp}
					title="No investment accounts yet."
					description="Connect a brokerage or retirement account, or add one by hand, to see it here."
					action={
						<Link
							to="/accounts"
							className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
						>
							Go to Accounts
						</Link>
					}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{data.omittedCurrencies.length > 0 ? (
						<output className="block rounded-md border border-border bg-muted px-3 py-2 text-sm">
							Left out of totals (no exchange rate into {data.baseCurrency}):{" "}
							{data.omittedCurrencies.join(", ")}.
						</output>
					) : null}
					<div className="grid gap-4 lg:grid-cols-2">
						<PortfolioSummary investments={data} />
						<AllocationChart
							allocation={data.allocation}
							total={data.total}
							currency={data.baseCurrency}
						/>
					</div>
					<InvestmentAccountList accounts={data.accounts} total={data.total} />
				</div>
			)}
		</>
	);
}
