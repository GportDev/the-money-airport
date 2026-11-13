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
import { formatCompactMoney } from "@/lib/chart";
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
					<CartesianGrid vertical={false} stroke="var(--border)" />
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						fontSize={12}
						minTickGap={24}
						tickFormatter={(value: string) => shortDate(value)}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						fontSize={12}
						width={56}
						tickFormatter={(value: number) => formatCompactMoney(value, currency)}
					/>
					<ReferenceLine y={month.safetyBuffer} stroke="var(--negative)" strokeDasharray="2 4" />
					{isTodayInMonth ? (
						<ReferenceLine x={today} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
					) : null}
					<Tooltip
						formatter={(value) => formatMoney(Number(value), currency)}
						labelFormatter={(label) => shortDate(String(label))}
					/>
					<Area
						type="stepAfter"
						dataKey="value"
						name="Operating cash"
						stroke="var(--primary)"
						fill="var(--primary)"
						fillOpacity={0.12}
						strokeWidth={2}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</figure>
	);
}
