import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BudgetProgress } from "@/components/budget/budget-progress";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Amount } from "@/components/ui/amount";
import { BUDGET_GROUP_LABELS } from "@/lib/budget";
import { cn } from "@/lib/cn";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import type { Dashboard, DashboardWidgetId, NetWorthRange, TransactionListItem } from "@/types";

export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
	budget: "Budget",
	net_worth: "Net worth",
	spending: "Spending",
	transactions: "Transactions",
	recurring: "Recurring",
};

const WIDGET_LINKS: Record<DashboardWidgetId, string> = {
	budget: "/budget",
	net_worth: "/accounts",
	spending: "/cash-flow",
	transactions: "/transactions",
	recurring: "/recurring",
};

function WidgetCard({
	id,
	subtitle,
	action,
	children,
}: {
	id: DashboardWidgetId;
	subtitle?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
}) {
	const headingId = `widget-${id}`;
	return (
		<section
			aria-labelledby={headingId}
			className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 id={headingId} className="text-sm font-medium">
						<Link
							to={WIDGET_LINKS[id]}
							className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
						>
							{WIDGET_LABELS[id]}
							<ChevronRight aria-hidden className="size-4" />
						</Link>
					</h2>
					{subtitle ? <div className="mt-1">{subtitle}</div> : null}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

export function BudgetWidget({
	budget,
	currency,
	month,
}: {
	budget: NonNullable<Dashboard["budget"]>;
	currency: string;
	month: string;
}) {
	const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
		new Date(`${month}-01T00:00:00Z`),
	);
	return (
		<WidgetCard id="budget" subtitle={<p className="text-xs text-muted-foreground">{monthName}</p>}>
			<ul className="flex flex-col gap-4">
				{budget.groups.map((group) => {
					const over = budget.hasBudget && group.spent > group.planned;
					return (
						<li key={group.key} className="flex flex-col gap-1.5 text-sm">
							<div className="flex items-baseline justify-between gap-2">
								<span>{BUDGET_GROUP_LABELS[group.key]}</span>
								<Amount className="text-muted-foreground">
									{budget.hasBudget
										? `${formatMoney(group.spent, currency)} of ${formatMoney(group.planned, currency)}`
										: `${formatMoney(group.spent, currency)} spent`}
								</Amount>
							</div>
							<BudgetProgress
								label={`${BUDGET_GROUP_LABELS[group.key]} budget used`}
								planned={budget.hasBudget ? group.planned : 0}
								actual={group.spent}
								isOver={over}
							/>
						</li>
					);
				})}
			</ul>
			{budget.hasBudget ? null : (
				<p className="text-sm text-muted-foreground">
					No budget yet.{" "}
					<Link to="/budget" className="text-foreground underline hover:text-primary">
						Set up a budget
					</Link>{" "}
					to see what is left.
				</p>
			)}
		</WidgetCard>
	);
}

export function NetWorthWidget({
	netWorth,
	currency,
	onRangeChange,
}: {
	netWorth: NonNullable<Dashboard["netWorth"]>;
	currency: string;
	onRangeChange: (range: NetWorthRange) => void;
}) {
	const { change, changePercent } = netWorth;
	return (
		<WidgetCard
			id="net_worth"
			subtitle={
				<>
					<p className="text-2xl font-semibold">
						<Amount>{formatMoney(netWorth.current, currency)}</Amount>
					</p>
					<p
						className={cn(
							"text-sm",
							change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground",
						)}
					>
						<Amount>
							{formatSignedMoney(change, currency)} ({(Math.abs(changePercent) * 100).toFixed(1)}
							%)
						</Amount>
					</p>
				</>
			}
			action={
				<label className="text-sm" htmlFor="dashboard-net-worth-range">
					<span className="sr-only">Net worth timeframe</span>
					<select
						id="dashboard-net-worth-range"
						className="rounded-md border border-border bg-card px-2 py-1 transition-colors hover:border-foreground/30"
						value={netWorth.range}
						onChange={(event) => onRangeChange(event.target.value as NetWorthRange)}
					>
						<option value="1m">1 month</option>
						<option value="3m">3 months</option>
						<option value="1y">1 year</option>
						<option value="ytd">YTD</option>
					</select>
				</label>
			}
		>
			<div className="h-28">
				{netWorth.series.length > 1 ? (
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={netWorth.series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
							<Tooltip
								formatter={(value) => [formatMoney(Number(value), currency), "Net worth"]}
								labelFormatter={(label) => String(label)}
							/>
							<Area
								type="linear"
								dataKey="value"
								stroke="var(--primary)"
								fill="var(--primary)"
								fillOpacity={0.08}
								isAnimationActive={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<p className="flex h-full items-center justify-center text-sm text-muted-foreground">
						History builds up as balances sync.
					</p>
				)}
			</div>
		</WidgetCard>
	);
}

export function SpendingWidget({
	spending,
	currency,
}: {
	spending: NonNullable<Dashboard["spending"]>;
	currency: string;
}) {
	const days = Math.max(spending.lastMonth.length, 31);
	const thisMonth = new Map(spending.thisMonth.map((row) => [row.day, row.amount]));
	const lastMonth = new Map(spending.lastMonth.map((row) => [row.day, row.amount]));
	const data = Array.from({ length: days }, (_, index) => ({
		day: index + 1,
		thisMonth: thisMonth.get(index + 1) ?? null,
		lastMonth: lastMonth.get(index + 1) ?? null,
	}));
	return (
		<WidgetCard
			id="spending"
			subtitle={
				<p className="text-2xl font-semibold">
					<Amount>{formatMoney(spending.total, currency)}</Amount>
				</p>
			}
		>
			<figure aria-label="Spending this month vs last month">
				<div className="h-28">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
							<XAxis dataKey="day" hide />
							<Tooltip
								formatter={(value, name) => [
									formatMoney(Number(value), currency),
									name === "thisMonth" ? "This month" : "Last month",
								]}
								labelFormatter={(label) => `Day ${String(label)}`}
							/>
							<Line
								type="linear"
								dataKey="lastMonth"
								stroke="var(--muted-foreground)"
								strokeDasharray="4 4"
								dot={false}
								isAnimationActive={false}
							/>
							<Line
								type="linear"
								dataKey="thisMonth"
								stroke="var(--primary)"
								strokeWidth={2}
								dot={false}
								isAnimationActive={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
				<figcaption className="mt-2 flex gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<span aria-hidden className="h-0.5 w-3 bg-primary" />
						This month
					</span>
					<span className="flex items-center gap-1">
						<span
							aria-hidden
							className="h-0.5 w-3 border-t border-dashed border-muted-foreground"
						/>
						Last month
					</span>
				</figcaption>
			</figure>
		</WidgetCard>
	);
}

export function TransactionsWidget({
	items,
	onOpen,
}: {
	items: TransactionListItem[];
	onOpen: (id: string) => void;
}) {
	return (
		<WidgetCard id="transactions">
			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">No transactions yet.</p>
			) : (
				<ul aria-label="Recent transactions" className="-my-2 flex flex-col">
					{items.map((item) => {
						const title = item.merchantName ?? item.name;
						return (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => onOpen(item.id)}
									className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left text-sm last:border-b-0 hover:bg-foreground/5"
								>
									<MerchantLogo name={title} url={item.merchantLogoUrl} />
									<span className="min-w-0">
										<span className="block truncate">{title}</span>
										{item.category ? (
											<span className="flex items-center gap-1 text-xs text-muted-foreground">
												<CategoryIcon
													icon={item.category.icon}
													color={item.category.color}
													className="size-3"
												/>
												<span className="truncate">{item.category.name}</span>
											</span>
										) : null}
									</span>
									<Amount className={cn(item.amount > 0 && "text-positive")}>
										{formatSignedMoney(item.amount, item.isoCurrencyCode)}
									</Amount>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</WidgetCard>
	);
}

export function RecurringWidget({
	recurring,
	currency,
}: {
	recurring: NonNullable<Dashboard["recurring"]>;
	currency: string;
}) {
	return (
		<WidgetCard
			id="recurring"
			subtitle={
				<p className="text-sm text-muted-foreground">
					<Amount className="text-foreground">
						{formatMoney(recurring.remainingDue, currency)}
					</Amount>{" "}
					remaining this month
				</p>
			}
		>
			<p className="text-sm text-muted-foreground">No recurring bills yet.</p>
		</WidgetCard>
	);
}
