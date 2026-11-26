import { Landmark, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ConnectPlaidButton } from "@/components/accounts/connect-plaid-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomizeDrawer } from "@/components/dashboard/customize-drawer";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
	BudgetWidget,
	NetWorthWidget,
	RecurringWidget,
	SpendingWidget,
	TransactionsWidget,
} from "@/components/dashboard/widgets";
import { TransactionDrawer } from "@/components/drawers/transaction-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { useDashboard } from "@/hooks/use-dashboard";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useDeleteTransaction } from "@/hooks/use-transactions";
import { DESK_QUERY } from "@/lib/constants";
import type { Dashboard, DashboardWidget, NetWorthRange, TransactionDetail } from "@/types";

function greeting(hour: number) {
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

export function DashboardPage() {
	const [range, setRange] = useState<NetWorthRange>("1m");
	const dashboard = useDashboard(range);
	const remove = useDeleteTransaction();
	const [customizing, setCustomizing] = useState(false);
	const [drawer, setDrawer] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<TransactionDetail | null>(null);
	const data = dashboard.data;
	const name = data?.greetingName;

	return (
		<>
			<PageHeader title="Dashboard">
				<Button
					variant="outline"
					type="button"
					disabled={!data}
					onClick={() => setCustomizing(true)}
				>
					<SlidersHorizontal aria-hidden className="size-4" />
					Customize
				</Button>
			</PageHeader>
			<p className="-mt-4 mb-6 text-lg">
				{greeting(new Date().getHours())}
				{name ? `, ${name}` : ""}!
			</p>

			{dashboard.isError ? (
				<QueryError
					message="Could not load the dashboard."
					isRetrying={dashboard.isFetching}
					onRetry={() => void dashboard.refetch()}
				/>
			) : !data ? (
				<DashboardSkeleton />
			) : !data.hasAccounts ? (
				<NoAccounts />
			) : (
				<Widgets data={data} onRangeChange={setRange} onOpenTransaction={setDrawer} />
			)}

			{customizing && data ? (
				<CustomizeDrawer widgets={data.widgets} onClose={() => setCustomizing(false)} />
			) : null}
			{drawer ? (
				<TransactionDrawer
					key={drawer}
					transactionId={drawer}
					onClose={() => setDrawer(null)}
					onOpenSimilar={(id) => setDrawer(id)}
					onDelete={(transaction) => {
						setDrawer(null);
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

function Widgets({
	data,
	onRangeChange,
	onOpenTransaction,
}: {
	data: Dashboard;
	onRangeChange: (range: NetWorthRange) => void;
	onOpenTransaction: (id: string) => void;
}) {
	const visible = [...data.widgets]
		.sort((a, b) => a.order - b.order)
		.filter((widget) => widget.visible);
	const currency = data.baseCurrency;
	const wide = useMediaQuery(DESK_QUERY);
	// Two independent stacks (1st, 3rd, … left; 2nd, 4th, … right) so tall widgets leave no gaps.
	const columns = wide
		? [visible.filter((_, index) => index % 2 === 0), visible.filter((_, index) => index % 2 === 1)]
		: [visible];

	function render(widget: DashboardWidget) {
		switch (widget.id) {
			case "budget":
				return data.budget ? (
					<BudgetWidget budget={data.budget} currency={currency} month={data.month} />
				) : null;
			case "net_worth":
				return data.netWorth ? (
					<NetWorthWidget
						netWorth={data.netWorth}
						currency={currency}
						onRangeChange={onRangeChange}
					/>
				) : null;
			case "spending":
				return data.spending ? (
					<SpendingWidget spending={data.spending} currency={currency} />
				) : null;
			case "transactions":
				return data.transactions ? (
					<TransactionsWidget items={data.transactions} onOpen={onOpenTransaction} />
				) : null;
			case "recurring":
				return data.recurring ? (
					<RecurringWidget recurring={data.recurring} currency={currency} />
				) : null;
		}
	}

	if (visible.length === 0) {
		return (
			<p className="py-10 text-center text-sm text-muted-foreground">
				Every widget is hidden. Use Customize to show some.
			</p>
		);
	}
	return (
		<div className="grid gap-4 desk:grid-cols-2">
			{columns.map((column, index) => (
				<div key={String(index)} className="flex min-w-0 flex-col gap-4">
					{column.map((widget) => (
						<div key={widget.id}>{render(widget)}</div>
					))}
				</div>
			))}
		</div>
	);
}

function NoAccounts() {
	return (
		<EmptyState
			icon={Landmark}
			title="Connect an account"
			description="Link a bank to see your budget, spending, and net worth here."
			action={<ConnectPlaidButton onDone={() => undefined} label="Connect an account" />}
		>
			<Link to="/accounts" className="text-sm underline hover:text-primary">
				Or add a manual account
			</Link>
		</EmptyState>
	);
}
