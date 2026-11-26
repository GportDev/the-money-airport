import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChartGradient } from "@/components/ui/chart-gradient";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import {
	areaFill,
	CHART_AXIS,
	CHART_GRID,
	formatCompactMoney,
	LINE_CURSOR,
	TOOLTIP_PROPS,
} from "@/lib/chart";
import { shortDate } from "@/lib/forecast";
import { formatMoney, todayIso } from "@/lib/format";
import type { ForecastMonth } from "@/types";

type Props = {
	month: ForecastMonth;
};

export function DailyBalanceChart({ month }: Props) {
	const currency = month.baseCurrency;
	const today = todayIso();
	const isTodayInMonth = month.series.some((point) => point.date === today);
	return (
		<figure aria-label="Operating cash by day" className="h-56">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={month.series} margin={{ top: 8, right: 16, left: 0 }}>
					<ChartGradient token="primary" />
					<CartesianGrid {...CHART_GRID} />
					<XAxis
						dataKey="date"
						{...CHART_AXIS}
						minTickGap={24}
						tickFormatter={(value: string) => shortDate(value)}
					/>
					<YAxis
						{...CHART_AXIS}
						width={56}
						tickFormatter={(value: number) => formatCompactMoney(value, currency)}
					/>
					<ReferenceLine y={month.safetyBuffer} stroke="var(--negative)" strokeDasharray="2 4" />
					{isTodayInMonth ? (
						<ReferenceLine x={today} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
					) : null}
					<Tooltip
						{...TOOLTIP_PROPS}
						cursor={LINE_CURSOR}
						content={(props) => (
							<ChartTooltip
								{...props}
								formatValue={(value) => formatMoney(value, currency)}
								formatLabel={shortDate}
							/>
						)}
					/>
					<Area
						type="stepAfter"
						dataKey="value"
						name="Operating cash"
						stroke="var(--primary)"
						fill={areaFill("primary")}
						strokeWidth={2}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</figure>
	);
}
