import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatCompactMoney } from "@/lib/chart";
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
					<CartesianGrid vertical={false} stroke="var(--border)" />
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
						formatter={(value) => [formatMoney(Number(value), currency), "Balance"]}
						labelFormatter={(label) => monthName(String(label).slice(0, 7))}
					/>
					<Area
						type="monotone"
						dataKey="endingBalance"
						stroke="var(--primary)"
						fill="var(--primary)"
						fillOpacity={0.12}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</figure>
	);
}
