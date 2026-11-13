import { Link, useSearchParams } from "react-router";
import { AllocationChart } from "@/components/investments/allocation-chart";
import { InvestmentAccountList } from "@/components/investments/investment-account-list";
import { InvestmentRangeToggle } from "@/components/investments/investment-range-toggle";
import { PortfolioSummary } from "@/components/investments/portfolio-summary";
import { PageHeader } from "@/components/layout/page-header";
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
				<p role="alert" className="text-sm text-negative">
					Could not load investments.
				</p>
			) : !data ? (
				<p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
			) : data.accounts.length === 0 ? (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-center">
					<p className="font-medium">No investment accounts yet.</p>
					<p className="text-sm text-muted-foreground">
						Connect a brokerage or retirement account, or add one by hand, to see it here.
					</p>
					<Link
						to="/accounts"
						className="mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					>
						Go to Accounts
					</Link>
				</div>
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
