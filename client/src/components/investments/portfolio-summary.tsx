import { useId } from "react";
import { SignedChange } from "@/components/investments/signed-change";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { Investments } from "@/types";

const RANGE_LABELS: Record<Investments["range"], string> = {
	"1m": "past month",
	"3m": "past 3 months",
	"1y": "past year",
};

export function PortfolioSummary({ investments }: { investments: Investments }) {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-6">
			<h2 id={headingId} className="text-sm font-medium text-muted-foreground">
				Portfolio total
			</h2>
			<p className="mt-2 text-3xl font-semibold">
				<Amount>{formatMoney(investments.total, investments.baseCurrency)}</Amount>
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				<SignedChange
					cents={investments.change}
					currency={investments.baseCurrency}
					percent={investments.changePercent}
				/>{" "}
				{RANGE_LABELS[investments.range]}
			</p>
		</section>
	);
}
