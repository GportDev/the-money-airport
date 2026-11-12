import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CashFlowChart, type CashFlowGranularity } from "../components/cash-flow/cash-flow-chart";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TransactionDrawer } from "../components/drawers/transaction-drawer";
import { PageHeader } from "../components/layout/page-header";
import { TransactionFeed } from "../components/transactions/transaction-feed";
import { Amount } from "../components/ui/amount";
import { useAccounts } from "../hooks/use-accounts";
import { useCashFlow } from "../hooks/use-cash-flow";
import { useDeleteTransaction, useTransactionFeed } from "../hooks/use-transactions";
import { cn } from "../lib/cn";
import { formatMoney, todayIso } from "../lib/format";
import type { TransactionDetail, TransactionFilters } from "../types";

function pad(value: number) {
	return String(value).padStart(2, "0");
}

/** `?month=YYYY-MM`, falling back to the User's current month. */
function parseMonth(value: string | null) {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	const year = match ? Number(match[1]) : Number(todayIso().slice(0, 4));
	const month = match ? Number(match[2]) : Number(todayIso().slice(5, 7));
	if (month < 1 || month > 12) {
		return { year: Number(todayIso().slice(0, 4)), month: Number(todayIso().slice(5, 7)) };
	}
	return { year, month };
}

function shiftMonth(year: number, month: number, delta: number) {
	const index = year * 12 + (month - 1) + delta;
	return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

function monthLabel(year: number, month: number) {
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, month - 1, 1)));
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
				<label className="text-sm" htmlFor="cash-flow-account">
					<span className="sr-only">Account scope</span>
					<select
						id="cash-flow-account"
						className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						value={accountId ?? ""}
						onChange={(event) =>
							patchParams((next) => {
								if (event.target.value) next.set("account", event.target.value);
								else next.delete("account");
							})
						}
					>
						<option value="">All accounts</option>
						{(accounts.data ?? []).map((account) => (
							<option key={account.id} value={account.id}>
								{account.name}
								{account.mask ? ` …${account.mask}` : ""}
							</option>
						))}
					</select>
				</label>
				<div className="flex items-center gap-1">
					<button
						type="button"
						className="rounded-md p-2 hover:bg-foreground/5"
						aria-label="Previous month"
						onClick={() => patchParams((next) => next.set("month", shiftMonth(year, month, -1)))}
					>
						<ChevronLeft aria-hidden className="size-4" />
					</button>
					<p className="min-w-32 text-center text-sm font-medium" aria-live="polite">
						{monthLabel(year, month)}
					</p>
					<button
						type="button"
						className="rounded-md p-2 hover:bg-foreground/5"
						aria-label="Next month"
						onClick={() => patchParams((next) => next.set("month", shiftMonth(year, month, 1)))}
					>
						<ChevronRight aria-hidden className="size-4" />
					</button>
				</div>
				<button
					className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					type="button"
					onClick={() => setDrawer("add")}
				>
					<Plus aria-hidden className="size-4" />
					Add
				</button>
			</PageHeader>

			{cashFlow.isError ? (
				<p role="alert" className="mb-4 text-sm text-negative">
					Could not load cash flow.
				</p>
			) : null}
			{data && data.omittedCurrencies.length > 0 ? (
				<output className="mb-4 block rounded-md border border-border bg-muted px-3 py-2 text-sm">
					Left out of totals (no exchange rate into {currency}): {data.omittedCurrencies.join(", ")}
					.
				</output>
			) : null}

			<div className="mb-4 grid gap-3 sm:grid-cols-3">
				<KpiCard
					label="Income"
					value={formatMoney(data?.summary.totalIncome ?? 0, currency)}
					className="text-positive"
				/>
				<KpiCard label="Expenses" value={formatMoney(data?.summary.totalExpenses ?? 0, currency)} />
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
					<h2 id="cash-flow-chart-heading" className="text-sm font-medium text-muted-foreground">
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

			{feed.isPending ? (
				<p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
			) : feed.isError ? (
				<p role="alert" className="py-10 text-center text-sm text-negative">
					Could not load transactions.
				</p>
			) : (
				<TransactionFeed
					items={items}
					hasNextPage={feed.hasNextPage}
					isFetchingNextPage={feed.isFetchingNextPage}
					fetchNextPage={() => void feed.fetchNextPage()}
					onOpen={(item) => setDrawer(item.id)}
					emptyMessage={`No transactions in ${monthLabel(year, month)}.`}
				/>
			)}

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
