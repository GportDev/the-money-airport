import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatMoney } from "../../lib/format";
import type { CashFlowDay, RunningBalanceKind } from "../../types";

export type CashFlowGranularity = "daily" | "weekly";

type Point = {
	label: string;
	income: number;
	expenses: number;
	runningBalance: number | null;
};

const BALANCE_LABEL: Record<RunningBalanceKind, string> = {
	net_worth: "Net worth",
	balance: "Balance",
	owed: "Owed",
};

/** Weeks are fixed day ranges (1–7, 8–14, …); the balance is the last known end of day. */
function toPoints(days: CashFlowDay[], granularity: CashFlowGranularity): Point[] {
	if (granularity === "daily") {
		return days.map((day) => ({
			label: String(day.day),
			income: day.income,
			expenses: day.expenses,
			runningBalance: day.runningBalance,
		}));
	}
	const weeks: Point[] = [];
	for (let start = 0; start < days.length; start += 7) {
		const slice = days.slice(start, start + 7);
		const first = slice[0];
		const last = slice[slice.length - 1];
		if (!first || !last) continue;
		const known = slice.filter((day) => day.runningBalance !== null);
		weeks.push({
			label: first.day === last.day ? String(first.day) : `${first.day}–${last.day}`,
			income: slice.reduce((sum, day) => sum + day.income, 0),
			expenses: slice.reduce((sum, day) => sum + day.expenses, 0),
			runningBalance: known[known.length - 1]?.runningBalance ?? null,
		});
	}
	return weeks;
}

function compactMoney(cents: number, currency: string) {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: 1,
		}).format(cents / 100);
	} catch {
		return String(Math.round(cents / 100));
	}
}

export function CashFlowChart({
	days,
	currency,
	granularity,
	showBalance,
	balanceKind,
}: {
	days: CashFlowDay[];
	currency: string;
	granularity: CashFlowGranularity;
	showBalance: boolean;
	balanceKind: RunningBalanceKind;
}) {
	const points = toPoints(days, granularity);
	const hasBalance = showBalance && points.some((point) => point.runningBalance !== null);
	const balanceLabel = BALANCE_LABEL[balanceKind];
	const names: Record<string, string> = {
		income: "Income",
		expenses: "Expenses",
		runningBalance: balanceLabel,
	};

	return (
		<figure aria-label={`${granularity === "daily" ? "Daily" : "Weekly"} income and expenses`}>
			<div className="h-64">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
						<CartesianGrid vertical={false} stroke="var(--border)" />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							fontSize={12}
							interval="preserveStartEnd"
						/>
						<YAxis
							yAxisId="flow"
							tickLine={false}
							axisLine={false}
							fontSize={12}
							width={56}
							tickFormatter={(value: number) => compactMoney(value, currency)}
						/>
						{hasBalance ? (
							<YAxis
								yAxisId="balance"
								orientation="right"
								tickLine={false}
								axisLine={false}
								fontSize={12}
								width={56}
								tickFormatter={(value: number) => compactMoney(value, currency)}
							/>
						) : null}
						<Tooltip
							formatter={(value, name) => [
								formatMoney(Number(value), currency),
								names[String(name)] ?? String(name),
							]}
							labelFormatter={(label) =>
								granularity === "daily" ? `Day ${String(label)}` : `Days ${String(label)}`
							}
						/>
						{hasBalance ? (
							<Area
								yAxisId="balance"
								type="stepAfter"
								dataKey="runningBalance"
								stroke="var(--primary)"
								fill="var(--primary)"
								fillOpacity={0.08}
								connectNulls={false}
								isAnimationActive={false}
							/>
						) : null}
						<Bar
							yAxisId="flow"
							dataKey="income"
							fill="var(--positive)"
							radius={[3, 3, 0, 0]}
							isAnimationActive={false}
						/>
						<Bar
							yAxisId="flow"
							dataKey="expenses"
							fill="var(--negative)"
							fillOpacity={0.75}
							radius={[3, 3, 0, 0]}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>
			<figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
				<span className="flex items-center gap-1">
					<span aria-hidden className="size-2 rounded-sm bg-positive" />
					Income
				</span>
				<span className="flex items-center gap-1">
					<span aria-hidden className="size-2 rounded-sm bg-negative/75" />
					Expenses
				</span>
				{hasBalance ? (
					<span className="flex items-center gap-1">
						<span aria-hidden className="h-0.5 w-3 bg-primary" />
						{balanceLabel}
					</span>
				) : null}
			</figcaption>
		</figure>
	);
}
