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
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { SelectField } from "@/components/ui/select-field";
import { useAccounts } from "@/hooks/use-accounts";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { useDeleteTransaction, useTransactionFeed } from "@/hooks/use-transactions";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { monthLabel, parseMonth, shiftMonth } from "@/lib/month";
import type { TransactionDetail, TransactionFilters } from "@/types";

function pad(value: number) {
	return String(value).padStart(2, "0");
}

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
	const currency = data?.baseCurrency ?? "USD";
	const net = data?.summary.netCashFlow ?? 0;

	return (
		<>
			<PageHeader title="Cash Flow">
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
				<MonthNavigator
					year={year}
					month={month}
					onShift={(delta) =>
						patchParams((next) => next.set("month", shiftMonth(year, month, delta)))
					}
				/>
				<Button type="button" onClick={() => setDrawer("add")}>
					<Plus aria-hidden className="size-4" />
					Add
				</Button>
			</PageHeader>

			{cashFlow.isError ? (
				<QueryError
					className="mb-4"
					message="Could not load cash flow."
					isRetrying={cashFlow.isFetching}
					onRetry={() => void cashFlow.refetch()}
				/>
			) : null}
			{data && data.omittedCurrencies.length > 0 ? (
				<output className="mb-4 block rounded-md border border-border bg-muted px-3 py-2 text-sm">
					Left out of totals (no exchange rate into {currency}): {data.omittedCurrencies.join(", ")}
					.
				</output>
			) : null}

			{cashFlow.isPending ? (
				<CashFlowSkeleton />
			) : (
				<>
					<div className="mb-4 grid gap-3 sm:grid-cols-3">
						<KpiCard
							label="Income"
							value={formatMoney(data?.summary.totalIncome ?? 0, currency)}
							className="text-positive"
						/>
						<KpiCard
							label="Expenses"
							value={formatMoney(data?.summary.totalExpenses ?? 0, currency)}
						/>
						<KpiCard
							label="Net"
							value={`${net > 0 ? "+" : net < 0 ? "-" : ""}${formatMoney(Math.abs(net), currency)}`}
							className={net > 0 ? "text-positive" : net < 0 ? "text-negative" : undefined}
						/>
					</div>

					<section
						aria-labelledby="cash-flow-chart-heading"
						className="mb-6 rounded-xl border border-border bg-card p-4"
					>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
							<h2
								id="cash-flow-chart-heading"
								className="text-sm font-medium text-muted-foreground"
							>
								Income vs expenses
							</h2>
							<div className="flex items-center gap-3 text-sm">
								<fieldset className="flex rounded-md border border-border p-0.5">
									<legend className="sr-only">Chart interval</legend>
									{(["daily", "weekly"] as const).map((option) => (
										<button
											key={option}
											type="button"
											aria-pressed={granularity === option}
											className={cn(
												"rounded px-2 py-1 capitalize transition-colors hover:bg-foreground/5 hover:text-foreground",
												granularity === option ? "bg-muted font-medium" : "text-muted-foreground",
											)}
											onClick={() =>
												patchParams((next) => {
													if (option === "weekly") next.set("view", "weekly");
													else next.delete("view");
												})
											}
										>
											{option}
										</button>
									))}
								</fieldset>
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
				</>
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

function KpiCard({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<section aria-label={label} className="rounded-xl border border-border bg-card p-4">
			<h2 className="text-sm text-muted-foreground">{label}</h2>
			<p className={cn("mt-1 text-2xl font-semibold", className)}>
				<Amount>{value}</Amount>
			</p>
		</section>
	);
}
