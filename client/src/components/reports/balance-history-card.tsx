import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ReportCard } from "@/components/reports/report-card";
import { useBalanceHistory } from "@/hooks/use-reports";
import { formatCompactMoney, seriesColor } from "@/lib/chart";
import { formatLongDate, formatMoney } from "@/lib/format";
import { reportStatus } from "@/lib/report-status";
import type { BalanceHistoryReport, ReportRange } from "@/types";

type Row = { date: string } & Record<string, number | string>;

/** One row per day with a column per BankAccount, the shape a multi-line chart reads. */
function byDate(points: BalanceHistoryReport["points"]) {
	const rows = new Map<string, Row>();
	for (const point of points) {
		const row = rows.get(point.date) ?? { date: point.date };
		row[point.accountId] = point.balance;
		rows.set(point.date, row);
	}
	return [...rows.values()];
}

function shortDate(isoDate: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${isoDate}T00:00:00Z`));
}

export function BalanceHistoryCard({ range }: { range: ReportRange }) {
	const history = useBalanceHistory(range);
	const rows = useMemo(() => byDate(history.data?.points ?? []), [history.data]);
	const accounts = history.data?.accounts ?? [];
	const currency = history.data?.baseCurrency ?? "USD";
	const names = new Map(accounts.map((row) => [row.accountId, row.name]));
	return (
		<ReportCard
			title="Account balances over time"
			status={reportStatus(history, (data) => data.points.length === 0)}
			omittedCurrencies={history.data?.omittedCurrencies}
			emptyMessage="No balance history in this range."
			className="lg:col-span-2"
		>
			<figure aria-label="Account balances over time">
				<div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={rows} margin={{ top: 8, right: 16, left: 0 }}>
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
							<Tooltip
								formatter={(value, key) => [
									formatMoney(Number(value), currency),
									names.get(String(key)) ?? String(key),
								]}
								labelFormatter={(label) => formatLongDate(String(label))}
							/>
							{accounts.map((account, index) => (
								<Line
									key={account.accountId}
									type="stepAfter"
									dataKey={account.accountId}
									stroke={seriesColor(index)}
									strokeWidth={1.5}
									dot={false}
									connectNulls={false}
									isAnimationActive={false}
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>
				<figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
					{accounts.map((account, index) => (
						<span key={account.accountId} className="flex items-center gap-1">
							<span
								aria-hidden
								className="h-0.5 w-3"
								// Series ink is picked per line, so it cannot be a static class.
								style={{ backgroundColor: seriesColor(index) }}
							/>
							{account.name}
							{account.isAsset ? "" : " (owed)"}
						</span>
					))}
				</figcaption>
			</figure>
		</ReportCard>
	);
}
