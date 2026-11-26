import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CashFlowChart, type CashFlowGranularity } from "@/components/cash-flow/cash-flow-chart";
import { CashFlowSkeleton } from "@/components/cash-flow/cash-flow-skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransactionDrawer } from "@/components/drawers/transaction-drawer";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/layout/page-header";
import { FeedState } from "@/components/transactions/feed-state";
import { NoTransactions } from "@/components/transactions/no-transactions";
import { TransactionFeed } from "@/components/transactions/transaction-feed";
import { Button } from "@/components/ui/button";
import { KpiCell, KpiStrip } from "@/components/ui/kpi-strip";
import { QueryError } from "@/components/ui/query-error";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "@/components/ui/toolbar";
import { useAccounts } from "@/hooks/use-accounts";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { useSettleClass } from "@/hooks/use-settle-class";
import { useDeleteTransaction, useTransactionFeed } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/format";
import { monthLabel, parseMonth, shiftMonth } from "@/lib/month";
import type { TransactionDetail, TransactionFilters } from "@/types";

function pad(value: number) {
	return String(value).padStart(2, "0");
}

const INTERVAL_OPTIONS = [
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
] as const;

export function CashFlowPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { year, month } = parseMonth(searchParams.get("month"));
	const accountId = searchParams.get("account");
	const granularity: CashFlowGranularity =
		searchParams.get("view") === "weekly" ? "weekly" : "daily";
	const accounts = useAccounts();
	const cashFlow = useCashFlow(year, month, accountId);
	const filters = useMemo<TransactionFilters>(() => {
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		return {
			dateFrom: `${year}-${pad(month)}-01`,
			dateTo: `${year}-${pad(month)}-${pad(lastDay)}`,
			accountIds: accountId ? [accountId] : [],
		};
	}, [year, month, accountId]);
	const feed = useTransactionFeed(filters);
	const remove = useDeleteTransaction();
	const items = useMemo(() => feed.data?.pages.flatMap((page) => page.data) ?? [], [feed.data]);
	const [showBalance, setShowBalance] = useState(true);
	const [drawer, setDrawer] = useState<"closed" | "add" | string>("closed");
	const [pendingDelete, setPendingDelete] = useState<TransactionDetail | null>(null);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
	}

	const data = cashFlow.data;
	const settle = useSettleClass(cashFlow.isPending);
	const currency = data?.baseCurrency ?? "USD";
	const net = data?.summary.netCashFlow ?? 0;

	return (
		<>
			<PageHeader title="Cash Flow">
				<Button type="button" onClick={() => setDrawer("add")}>
					<Plus aria-hidden className="size-4" />
					Add
				</Button>
			</PageHeader>
			<Toolbar aria-label="Cash flow filters">
				<ToolbarGroup>
					<MonthNavigator
						year={year}
						month={month}
						onShift={(delta) =>
							patchParams((next) => next.set("month", shiftMonth(year, month, delta)))
						}
					/>
				</ToolbarGroup>
				<ToolbarDivider />
				<SelectField
					aria-label="Account scope"
					variant="ghost"
					value={accountId ?? ""}
					options={[
						{ value: "", label: "All accounts" },
						...(accounts.data ?? []).map((account) => ({
							value: account.id,
							label: `${account.name}${account.mask ? ` …${account.mask}` : ""}`,
						})),
					]}
					onValueChange={(value) =>
						patchParams((next) => {
							if (value) next.set("account", value);
							else next.delete("account");
						})
					}
				/>
			</Toolbar>

			{cashFlow.isError ? (
				<QueryError
					className="mb-4"
					message="Could not load cash flow."
					isRetrying={cashFlow.isFetching}
					onRetry={() => void cashFlow.refetch()}
				/>
			) : null}
			{data && data.omittedCurrencies.length > 0 ? (
				<output className="mb-4 block rounded-lg bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground">
					Left out of totals (no exchange rate into {currency}): {data.omittedCurrencies.join(", ")}
					.
				</output>
			) : null}

			{cashFlow.isPending ? (
				<CashFlowSkeleton />
			) : (
				<div className={settle}>
					<KpiStrip className="mb-4">
						<KpiCell
							label="Income"
							markerClassName="bg-positive"
							value={formatMoney(data?.summary.totalIncome ?? 0, currency)}
						/>
						<KpiCell
							label="Expenses"
							markerClassName="bg-negative/75"
							value={formatMoney(data?.summary.totalExpenses ?? 0, currency)}
						/>
						<KpiCell
							label="Net"
							markerClassName={net < 0 ? "bg-negative" : "bg-primary"}
							value={`${net > 0 ? "+" : net < 0 ? "-" : ""}${formatMoney(Math.abs(net), currency)}`}
						/>
					</KpiStrip>

					<section
						aria-labelledby="cash-flow-chart-heading"
						className="mb-6 rounded-xl border border-border bg-card p-5"
					>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
							<h2 id="cash-flow-chart-heading" className="text-[15px] font-semibold">
								Income vs expenses
							</h2>
							<div className="flex items-center gap-3 text-sm">
								<Segmented
									aria-label="Chart interval"
									size="sm"
									value={granularity}
									options={INTERVAL_OPTIONS}
									onValueChange={(option) =>
										patchParams((next) => {
											if (option === "weekly") next.set("view", "weekly");
											else next.delete("view");
										})
									}
								/>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={showBalance}
										onChange={(event) => setShowBalance(event.target.checked)}
									/>
									Running balance
								</label>
							</div>
						</div>
						{data ? (
							<CashFlowChart
								days={data.daily}
								currency={currency}
								granularity={granularity}
								showBalance={showBalance}
								balanceKind={data.runningBalanceKind}
							/>
						) : (
							<div className="h-64" aria-hidden />
						)}
					</section>
				</div>
			)}

			<FeedState
				feed={feed}
				isEmpty={items.length === 0}
				empty={
					<NoTransactions
						title={`No transactions in ${monthLabel(year, month)}.`}
						description="Add one by hand, or pick another month or account."
						onAdd={() => setDrawer("add")}
					/>
				}
			>
				<TransactionFeed
					items={items}
					hasNextPage={feed.hasNextPage}
					isFetchingNextPage={feed.isFetchingNextPage}
					fetchNextPage={() => void feed.fetchNextPage()}
					onOpen={(item) => setDrawer(item.id)}
				/>
			</FeedState>

			{drawer !== "closed" ? (
				<TransactionDrawer
					key={drawer}
					transactionId={drawer === "add" ? null : drawer}
					onClose={() => setDrawer("closed")}
					onOpenSimilar={(id) => setDrawer(id)}
					onDelete={(transaction) => {
						setDrawer("closed");
						setPendingDelete(transaction);
					}}
				/>
			) : null}
			{pendingDelete ? (
				<ConfirmDialog
					title={`Delete ${pendingDelete.name}?`}
					onCancel={() => setPendingDelete(null)}
					onConfirm={() => {
						void remove.mutateAsync(pendingDelete.id).finally(() => setPendingDelete(null));
					}}
				/>
			) : null}
		</>
	);
}
