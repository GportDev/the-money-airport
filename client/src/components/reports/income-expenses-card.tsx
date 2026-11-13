import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthTick } from "@/components/reports/month-tick";
import { ReportCard } from "@/components/reports/report-card";
import { useIncomeVsExpenses } from "@/hooks/use-reports";
import { formatCompactMoney } from "@/lib/chart";
import { formatMoney } from "@/lib/format";
import { reportMonthLabel } from "@/lib/report-range";
import { reportStatus } from "@/lib/report-status";
import type { ReportRange } from "@/types";

const SERIES_NAMES: Record<string, string> = { income: "Income", expenses: "Expenses" };

type Props = {
	range: ReportRange;
	onSelectMonth: (month: string) => void;
};

export function IncomeExpensesCard({ range, onSelectMonth }: Props) {
	const report = useIncomeVsExpenses(range);
	const currency = report.data?.baseCurrency ?? "USD";
	const selectBar = (bar: { payload?: { month: string } }) => {
		if (bar.payload) onSelectMonth(bar.payload.month);
	};
	return (
		<ReportCard
			title="Income vs expenses"
			status={reportStatus(report, (data) =>
				data.months.every((row) => row.income === 0 && row.expenses === 0),
			)}
			omittedCurrencies={report.data?.omittedCurrencies}
			emptyMessage="No transactions in this range."
		>
			<figure aria-label="Income vs expenses by month">
				<div className="h-56">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={report.data?.months ?? []} margin={{ top: 8, right: 8, left: 0 }}>
							<CartesianGrid vertical={false} stroke="var(--border)" />
							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								interval="preserveStartEnd"
								tick={(props) => <MonthTick {...props} onSelect={onSelectMonth} />}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								fontSize={12}
								width={56}
								tickFormatter={(value: number) => formatCompactMoney(value, currency)}
							/>
							<Tooltip
								formatter={(value, name) => [
									formatMoney(Number(value), currency),
									SERIES_NAMES[String(name)] ?? String(name),
								]}
								labelFormatter={(label) => reportMonthLabel(String(label))}
							/>
							<Bar
								dataKey="income"
								fill="var(--positive)"
								radius={[3, 3, 0, 0]}
								className="cursor-pointer"
								isAnimationActive={false}
								onClick={selectBar}
							/>
							<Bar
								dataKey="expenses"
								fill="var(--negative)"
								fillOpacity={0.75}
								radius={[3, 3, 0, 0]}
								className="cursor-pointer"
								isAnimationActive={false}
								onClick={selectBar}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
				<figcaption className="mt-2 flex gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<span aria-hidden className="size-2 rounded-sm bg-positive" />
						Income
					</span>
					<span className="flex items-center gap-1">
						<span aria-hidden className="size-2 rounded-sm bg-negative/75" />
						Expenses
					</span>
				</figcaption>
			</figure>
		</ReportCard>
	);
}
