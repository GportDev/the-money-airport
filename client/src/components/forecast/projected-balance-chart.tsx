import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import {
	CHART_AXIS,
	CHART_GRID,
	formatCompactMoney,
	LINE_CURSOR,
	TOOLTIP_PROPS,
} from "@/lib/chart";
import { shortMonthName } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import type { ForecastSummary } from "@/types";

type Props = {
	summary: ForecastSummary;
	currentMonth: number | null;
};

type Point = { month: number; actual: number | null; projected: number | null };

/** Past months draw solid, projected ones dashed; the last actual point joins the two lines. */
function pointsOf(series: ForecastSummary["projectedBalanceSeries"]): Point[] {
	return series.map((entry, index) => {
		const next = series[index + 1];
		const isJoin = !entry.projected && next?.projected === true;
		return {
			month: entry.month,
			actual: entry.projected ? null : entry.value,
			projected: entry.projected || isJoin ? entry.value : null,
		};
	});
}

export function ProjectedBalanceChart({ summary, currentMonth }: Props) {
	const currency = summary.baseCurrency;
	return (
		<figure aria-label="Projected Operating cash by month" className="h-64">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={pointsOf(summary.projectedBalanceSeries)}
					margin={{ top: 8, right: 16, left: 0 }}
				>
					<CartesianGrid {...CHART_GRID} />
					<XAxis
						dataKey="month"
						{...CHART_AXIS}
						tickFormatter={(value: number) => shortMonthName(value)}
					/>
					<YAxis
						{...CHART_AXIS}
						width={56}
						tickFormatter={(value: number) => formatCompactMoney(value, currency)}
					/>
					<ReferenceLine
						y={summary.safetyBuffer}
						stroke="var(--negative)"
						strokeDasharray="2 4"
						label={{ value: "Buffer", position: "insideTopRight", fontSize: 11 }}
					/>
					{currentMonth ? (
						<ReferenceLine x={currentMonth} stroke="var(--muted-foreground)" strokeOpacity={0.4} />
					) : null}
					<Tooltip
						{...TOOLTIP_PROPS}
						cursor={LINE_CURSOR}
						content={(props) => (
							<ChartTooltip
								{...props}
								formatValue={(value) => formatMoney(value, currency)}
								formatLabel={(label) => shortMonthName(Number(label))}
							/>
						)}
					/>
					<Line
						type="monotone"
						dataKey="actual"
						name="Actual"
						stroke="var(--primary)"
						strokeWidth={2}
						dot={false}
						isAnimationActive={false}
						connectNulls={false}
					/>
					<Line
						type="monotone"
						dataKey="projected"
						name="Projected"
						stroke="var(--primary)"
						strokeWidth={2}
						strokeDasharray="6 4"
						dot={false}
						isAnimationActive={false}
						connectNulls={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</figure>
	);
}
