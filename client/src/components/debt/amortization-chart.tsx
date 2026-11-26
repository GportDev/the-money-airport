import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChartGradient } from "@/components/ui/chart-gradient";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { areaFill, CHART_GRID, formatCompactMoney, LINE_CURSOR, TOOLTIP_PROPS } from "@/lib/chart";
import { monthName } from "@/lib/debt";
import { formatMoney } from "@/lib/format";
import type { AmortizationRow } from "@/types";

type Props = {
	schedule: AmortizationRow[];
	currency: string;
};

export function AmortizationChart({ schedule, currency }: Props) {
	return (
		<figure aria-label="Loan balance over time" className="h-44">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={schedule} margin={{ top: 8, right: 8, left: 0 }}>
					<ChartGradient token="primary" />
					<CartesianGrid {...CHART_GRID} />
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						fontSize={11}
						minTickGap={32}
						tickFormatter={(value: string) => monthName(value.slice(0, 7))}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						fontSize={11}
						width={52}
						tickFormatter={(value: number) => formatCompactMoney(value, currency)}
					/>
					<Tooltip
						{...TOOLTIP_PROPS}
						cursor={LINE_CURSOR}
						content={(props) => (
							<ChartTooltip
								{...props}
								names={{ endingBalance: "Balance" }}
								formatValue={(value) => formatMoney(value, currency)}
								formatLabel={(label) => monthName(label.slice(0, 7))}
							/>
						)}
					/>
					<Area
						type="monotone"
						dataKey="endingBalance"
						stroke="var(--primary)"
						fill={areaFill("primary")}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</figure>
	);
}
