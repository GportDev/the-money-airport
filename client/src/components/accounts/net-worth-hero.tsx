import { Line, LineChart, ResponsiveContainer } from "recharts";
import { formatMoney } from "../../lib/format";
import type { NetWorth } from "../../types";
import { Amount } from "../ui/amount";

export function NetWorthHero({
	netWorth,
	range = "1m",
	onRangeChange,
}: {
	netWorth: NetWorth | undefined;
	range?: string;
	onRangeChange?: (range: string) => void;
}) {
	const current = netWorth?.current ?? 0;
	const series = netWorth?.series ?? [];

	return (
		<section
			aria-labelledby="net-worth-heading"
			className="rounded-xl border border-border bg-card p-6"
		>
			<div className="flex items-start justify-between gap-3">
				<h2 id="net-worth-heading" className="text-sm font-medium text-muted-foreground">
					Net worth
				</h2>
				{onRangeChange ? (
					<label className="text-sm" htmlFor="net-worth-range">
						Timeframe
						<select
							id="net-worth-range"
							className="ml-2 rounded-md border border-border bg-card px-2 py-1"
							value={range}
							onChange={(event) => onRangeChange(event.target.value)}
						>
							<option value="1m">1 month</option>
							<option value="3m">3 months</option>
							<option value="1y">1 year</option>
							<option value="ytd">YTD</option>
						</select>
					</label>
				) : null}
			</div>
			<p className="mt-2 text-3xl font-semibold">
				<Amount>{formatMoney(current, netWorth?.baseCurrency ?? "USD")}</Amount>
			</p>
			<div className="mt-4 h-24">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={series.length > 0 ? series : [{ date: "empty", value: 0 }]}>
						<Line type="monotone" dataKey="value" stroke="var(--primary)" dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</section>
	);
}
