import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChartGradient } from "@/components/ui/chart-gradient";
import { ChartLegend } from "@/components/ui/chart-legend";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import {
	ACTIVE_DOT,
	areaFill,
	BAR_CURSOR,
	BAR_RADIUS,
	CHART_AXIS,
	CHART_GRID,
	TOOLTIP_PROPS,
} from "@/lib/chart";
import { formatMoney } from "@/lib/format";
import type { CashFlowDay, RunningBalanceKind } from "@/types";

export type CashFlowGranularity = "daily" | "weekly";

type Point = {
	label: string;
	income: number;
	expenses: number;
	runningBalance: number | null;
};

const BALANCE_LABEL: Record<RunningBalanceKind, string> = {
	net_worth: "Net worth",
	balance: "Balance",
	owed: "Owed",
};

/** Weeks are fixed day ranges (1–7, 8–14, …); the balance is the last known end of day. */
function toPoints(days: CashFlowDay[], granularity: CashFlowGranularity): Point[] {
	if (granularity === "daily") {
		return days.map((day) => ({
			label: String(day.day),
			income: day.income,
			expenses: day.expenses,
			runningBalance: day.runningBalance,
		}));
	}
	const weeks: Point[] = [];
	for (let start = 0; start < days.length; start += 7) {
		const slice = days.slice(start, start + 7);
		const first = slice[0];
		const last = slice[slice.length - 1];
		if (!first || !last) continue;
		const known = slice.filter((day) => day.runningBalance !== null);
		weeks.push({
			label: first.day === last.day ? String(first.day) : `${first.day}–${last.day}`,
			income: slice.reduce((sum, day) => sum + day.income, 0),
			expenses: slice.reduce((sum, day) => sum + day.expenses, 0),
			runningBalance: known[known.length - 1]?.runningBalance ?? null,
		});
	}
	return weeks;
}

function compactMoney(cents: number, currency: string) {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: 1,
		}).format(cents / 100);
	} catch {
		return String(Math.round(cents / 100));
	}
}

export function CashFlowChart({
	days,
	currency,
	granularity,
	showBalance,
	balanceKind,
}: {
	days: CashFlowDay[];
	currency: string;
	granularity: CashFlowGranularity;
	showBalance: boolean;
	balanceKind: RunningBalanceKind;
}) {
	const points = toPoints(days, granularity);
	const hasBalance = showBalance && points.some((point) => point.runningBalance !== null);
	const balanceLabel = BALANCE_LABEL[balanceKind];
	const names: Record<string, string> = {
		income: "Income",
		expenses: "Expenses",
		runningBalance: balanceLabel,
	};

	return (
		<figure aria-label={`${granularity === "daily" ? "Daily" : "Weekly"} income and expenses`}>
			<div className="h-64">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
						<ChartGradient token="primary" />
						<CartesianGrid {...CHART_GRID} />
						<XAxis dataKey="label" {...CHART_AXIS} interval="preserveStartEnd" />
						<YAxis
							yAxisId="flow"
							{...CHART_AXIS}
							width={56}
							tickFormatter={(value: number) => compactMoney(value, currency)}
						/>
						{hasBalance ? (
							<YAxis
								yAxisId="balance"
								orientation="right"
								{...CHART_AXIS}
								width={56}
								tickFormatter={(value: number) => compactMoney(value, currency)}
							/>
						) : null}
						<Tooltip
							{...TOOLTIP_PROPS}
							cursor={BAR_CURSOR}
							content={(props) => (
								<ChartTooltip
									{...props}
									names={names}
									formatValue={(value) => formatMoney(value, currency)}
									formatLabel={(label) =>
										granularity === "daily" ? `Day ${label}` : `Days ${label}`
									}
								/>
							)}
						/>
						{hasBalance ? (
							<Area
								yAxisId="balance"
								type="stepAfter"
								dataKey="runningBalance"
								stroke="var(--primary)"
								strokeWidth={2}
								fill={areaFill("primary")}
								activeDot={ACTIVE_DOT}
								connectNulls={false}
								isAnimationActive={false}
							/>
						) : null}
						<Bar
							yAxisId="flow"
							dataKey="income"
							fill="var(--positive)"
							radius={BAR_RADIUS}
							isAnimationActive={false}
						/>
						<Bar
							yAxisId="flow"
							dataKey="expenses"
							fill="var(--negative)"
							fillOpacity={0.75}
							radius={BAR_RADIUS}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>
			<figcaption className="mt-3">
				<ChartLegend
					items={[
						{ label: "Income", swatchClassName: "bg-positive" },
						{ label: "Expenses", swatchClassName: "bg-negative/75" },
						...(hasBalance
							? [{ label: balanceLabel, swatchClassName: "bg-primary", shape: "line" as const }]
							: []),
					]}
				/>
			</figcaption>
		</figure>
	);
}
