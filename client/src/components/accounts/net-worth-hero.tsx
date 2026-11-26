import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Amount } from "@/components/ui/amount";
import { SelectField } from "@/components/ui/select-field";
import { formatMoney } from "@/lib/format";
import type { NetWorth } from "@/types";

const RANGE_OPTIONS = [
	{ value: "1m", label: "1 month" },
	{ value: "3m", label: "3 months" },
	{ value: "1y", label: "1 year" },
	{ value: "ytd", label: "YTD" },
];

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
					<SelectField
						aria-label="Timeframe"
						variant="ghost"
						lead="Timeframe"
						value={range}
						options={RANGE_OPTIONS}
						onValueChange={onRangeChange}
					/>
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
