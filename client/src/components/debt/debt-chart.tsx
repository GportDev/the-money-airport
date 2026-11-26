import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import {
	BAR_CURSOR,
	CHART_AXIS,
	CHART_GRID,
	formatCompactMoney,
	seriesColor,
	TOOLTIP_PROPS,
} from "@/lib/chart";
import { monthName } from "@/lib/debt";
import { formatMoney } from "@/lib/format";
import type { DebtPlan } from "@/types";

type Props = {
	plan: DebtPlan;
};

/** Stacked projected balance per in-plan liability, month by month until debt-free. */
export function DebtChart({ plan }: Props) {
	const currency = plan.baseCurrency;
	const lastMonth = plan.debtFreeMonth ?? plan.series.at(-1)?.month;
	const rows = plan.series
		.filter((point) => !lastMonth || point.month <= lastMonth)
		.map((point) => ({ month: point.month, payback: point.payback, ...point.balances }));
	const summary = plan.debtFreeMonth
		? `Debt-free in ${monthName(plan.debtFreeMonth)}, with ${formatMoney(plan.projectedInterest12m, currency)} interest over the next 12 months.`
		: "Not debt-free within the next 2 years at this plan.";
	return (
		<figure aria-label="Projected balance per liability" className="flex flex-col gap-2">
			<div className="h-56">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} margin={{ top: 8, right: 16, left: 0 }}>
						<CartesianGrid {...CHART_GRID} />
						<XAxis
							dataKey="month"
							{...CHART_AXIS}
							tickFormatter={(value: string) => monthName(value)}
						/>
						<YAxis
							{...CHART_AXIS}
							width={56}
							tickFormatter={(value: number) => formatCompactMoney(value, currency)}
						/>
						<Tooltip
							{...TOOLTIP_PROPS}
							cursor={BAR_CURSOR}
							content={(props) => (
								<ChartTooltip
									{...props}
									names={Object.fromEntries(
										plan.liabilities.map((entry) => [entry.account.id, entry.account.name]),
									)}
									formatValue={(value) => formatMoney(value, currency)}
									formatLabel={monthName}
									showTotal
								/>
							)}
						/>
						{plan.liabilities.map((entry, index) => (
							<Bar
								key={entry.account.id}
								dataKey={entry.account.id}
								stackId="debt"
								fill={seriesColor(index)}
								isAnimationActive={false}
							/>
						))}
					</BarChart>
				</ResponsiveContainer>
			</div>
			<figcaption className="text-sm text-muted-foreground">{summary}</figcaption>
		</figure>
	);
}
