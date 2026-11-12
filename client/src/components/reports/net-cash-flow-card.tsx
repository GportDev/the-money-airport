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
import { MonthTick } from "@/components/reports/month-tick";
import { ReportCard } from "@/components/reports/report-card";
import { useCashFlowTrend } from "@/hooks/use-reports";
import { formatCompactMoney } from "@/lib/chart";
import { formatSignedMoney } from "@/lib/format";
import { reportMonthLabel } from "@/lib/report-range";
import { reportStatus } from "@/lib/report-status";
import type { ReportRange } from "@/types";

type Props = {
	range: ReportRange;
	onSelectMonth: (month: string) => void;
};

export function NetCashFlowCard({ range, onSelectMonth }: Props) {
	const trend = useCashFlowTrend(range);
	const currency = trend.data?.baseCurrency ?? "USD";
	return (
		<ReportCard
			title="Net cash flow"
			status={reportStatus(trend, (data) => data.months.every((row) => row.net === 0))}
			omittedCurrencies={trend.data?.omittedCurrencies}
			emptyMessage="No transactions in this range."
		>
			<figure aria-label="Net cash flow by month" className="h-56">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={trend.data?.months ?? []} margin={{ top: 8, right: 16, left: 0 }}>
						<CartesianGrid vertical={false} stroke="var(--border)" />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							interval="preserveStartEnd"
							padding={{ left: 16, right: 16 }}
							tick={(props) => <MonthTick {...props} onSelect={onSelectMonth} />}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							fontSize={12}
							width={56}
							tickFormatter={(value: number) => formatCompactMoney(value, currency)}
						/>
						<ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
						<Tooltip
							formatter={(value) => [formatSignedMoney(Number(value), currency), "Net"]}
							labelFormatter={(label) => reportMonthLabel(String(label))}
						/>
						<Line
							type="monotone"
							dataKey="net"
							stroke="var(--primary)"
							strokeWidth={2}
							isAnimationActive={false}
							activeDot={{
								r: 5,
								className: "cursor-pointer",
								onClick: (_event, dot) => {
									const month = (dot as { payload?: { month: string } }).payload?.month;
									if (month) onSelectMonth(month);
								},
							}}
						/>
					</LineChart>
				</ResponsiveContainer>
			</figure>
		</ReportCard>
	);
}
