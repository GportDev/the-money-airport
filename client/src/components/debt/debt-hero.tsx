import { SummaryStat } from "@/components/forecast/summary-stat";
import { monthName } from "@/lib/debt";
import type { DebtPlan } from "@/types";

type Props = {
	plan: DebtPlan;
};

export function DebtHero({ plan }: Props) {
	const currency = plan.baseCurrency;
	return (
		<dl aria-label="Debt summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
			<SummaryStat label="Total debt" cents={plan.totalDebt} currency={currency} />
			<div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
				<dt className="text-xs text-muted-foreground">Debt-free</dt>
				<dd className="text-lg font-semibold">
					{plan.debtFreeMonth ? monthName(plan.debtFreeMonth) : "Not in 2 years"}
				</dd>
			</div>
			<SummaryStat
				label="Interest, next 12 months"
				cents={plan.projectedInterest12m}
				currency={currency}
			/>
			<div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
				<dt className="text-xs text-muted-foreground">Utilization</dt>
				<dd className="text-lg font-semibold">
					{plan.utilization === null ? "—" : `${Math.round(plan.utilization * 100)}%`}
				</dd>
			</div>
		</dl>
	);
}
