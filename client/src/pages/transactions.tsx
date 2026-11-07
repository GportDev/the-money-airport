import { Plus, Search, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ConfirmDialog } from "../components/confirm-dialog";
import { BulkCategorizeDrawer } from "../components/drawers/bulk-categorize-drawer";
import { CategoryManagerDrawer } from "../components/drawers/category-manager-drawer";
import { TransactionDrawer } from "../components/drawers/transaction-drawer";
import { PageHeader } from "../components/layout/page-header";
import { type FeedColumns, TransactionFeed } from "../components/transactions/transaction-feed";
import { useAccounts } from "../hooks/use-accounts";
import { useCategories } from "../hooks/use-categories";
import { useDeleteTransaction, useTransactionFeed } from "../hooks/use-transactions";
import { cn } from "../lib/cn";
import { majorUnitsToCents } from "../lib/format";
import type { TransactionDetail, TransactionFilters } from "../types";

const TABS = [
	{ key: "all", label: "All" },
	{ key: "receipts", label: "Receipts" },
	{ key: "retail", label: "Retail Sync" },
] as const;

const buttonClass = "rounded-md border border-border px-3 py-2 text-sm";
const fieldClass = "rounded-md border border-border bg-card px-3 py-2";

function filtersFromParams(params: URLSearchParams): TransactionFilters {
	const pending = params.get("pending");
	const min = params.get("min");
	const max = params.get("max");
	return {
		search: params.get("search") ?? undefined,
		accountIds: params.getAll("account"),
		categoryIds: params.getAll("category"),
		pending: pending === "pending" ? true : pending === "posted" ? false : undefined,
		amountMin: min ? Math.abs(majorUnitsToCents(min)) : undefined,
		amountMax: max ? Math.abs(majorUnitsToCents(max)) : undefined,
		dateFrom: params.get("from") ?? undefined,
		dateTo: params.get("to") ?? undefined,
	};
}

export function TransactionsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = searchParams.get("tab") ?? "all";
	const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
	const feed = useTransactionFeed(filters);
	const remove = useDeleteTransaction();
	const [searchInput, setSearchInput] = useState(filters.search ?? "");
	const [drawer, setDrawer] = useState<"closed" | "add" | string>("closed");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [columnsOpen, setColumnsOpen] = useState(false);
	const [categoriesOpen, setCategoriesOpen] = useState(false);
	const [columns, setColumns] = useState<FeedColumns>({ category: true, account: true });
	const [selecting, setSelecting] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkOpen, setBulkOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<TransactionDetail | null>(null);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams(
			(current) => {
				const next = new URLSearchParams(current);
				mutate(next);
				return next;
			},
			{ replace: true },
		);
	}

	// Debounce on input only; patchParams reads the latest params through the updater.
	// biome-ignore lint/correctness/useExhaustiveDependencies: patchParams changes every render
	useEffect(() => {
		const handle = window.setTimeout(() => {
			patchParams((params) => {
				const value = searchInput.trim();
				if (value) {
					params.set("search", value);
				} else {
					params.delete("search");
				}
			});
		}, 300);
		return () => window.clearTimeout(handle);
	}, [searchInput]);

	const items = useMemo(() => feed.data?.pages.flatMap((page) => page.data) ?? [], [feed.data]);
	const activeFilterCount =
		(filters.accountIds?.length ?? 0) +
		(filters.categoryIds?.length ?? 0) +
		(filters.pending !== undefined ? 1 : 0) +
		(filters.amountMin !== undefined || filters.amountMax !== undefined ? 1 : 0) +
		(filters.dateFrom || filters.dateTo ? 1 : 0);

	function stopSelecting() {
		setSelecting(false);
		setSelected(new Set());
	}

	return (
		<>
			<PageHeader title="Transactions">
				<button
					className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
					type="button"
					onClick={() => setDrawer("add")}
				>
					<Plus aria-hidden className="size-4" />
					Add
				</button>
			</PageHeader>
			<nav aria-label="Transaction views" className="mb-4 flex gap-1 border-b border-border">
				{TABS.map((item) => (
					<button
						key={item.key}
						type="button"
						aria-current={tab === item.key ? "page" : undefined}
						className={cn(
							"-mb-px border-b-2 px-3 py-2 text-sm",
							tab === item.key
								? "border-primary font-medium"
								: "border-transparent text-muted-foreground",
						)}
						onClick={() =>
							patchParams((params) => {
								if (item.key === "all") params.delete("tab");
								else params.set("tab", item.key);
							})
						}
					>
						{item.label}
					</button>
				))}
			</nav>
			{tab === "all" ? (
				<>
					<div className="mb-4 flex flex-wrap items-center gap-2">
						<label className="relative flex min-w-48 flex-1 items-center" htmlFor="tx-search">
							<span className="sr-only">Search transactions</span>
							<Search
								aria-hidden
								className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
							/>
							<input
								id="tx-search"
								type="search"
								placeholder="Search"
								className={cn(fieldClass, "w-full pl-9")}
								value={searchInput}
								onChange={(event) => setSearchInput(event.target.value)}
							/>
						</label>
						<button className={buttonClass} type="button" onClick={() => setFiltersOpen(true)}>
							Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
						</button>
						<button className={buttonClass} type="button" onClick={() => setColumnsOpen(true)}>
							Columns
						</button>
						{selecting ? (
							<>
								<button
									className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
									type="button"
									disabled={selected.size === 0}
									onClick={() => setBulkOpen(true)}
								>
									Edit {selected.size}
								</button>
								<button className={buttonClass} type="button" onClick={stopSelecting}>
									Cancel
								</button>
							</>
						) : (
							<button className={buttonClass} type="button" onClick={() => setSelecting(true)}>
								Edit multiple
							</button>
						)}
					</div>
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
							columns={columns}
							selecting={selecting}
							selected={selected}
							onToggle={(id) =>
								setSelected((current) => {
									const next = new Set(current);
									if (next.has(id)) next.delete(id);
									else next.add(id);
									return next;
								})
							}
							emptyMessage={
								activeFilterCount > 0 || filters.search
									? "No transactions match these filters."
									: "No transactions yet. Connect an account or add one."
							}
						/>
					)}
				</>
			) : (
				<p className="py-10 text-center text-sm text-muted-foreground">
					{tab === "receipts"
						? "Receipts are not available yet."
						: "Retail Sync is not available yet."}
				</p>
			)}

			{filtersOpen ? (
				<FiltersPanel
					params={searchParams}
					onPatch={patchParams}
					onManageCategories={() => {
						setFiltersOpen(false);
						setCategoriesOpen(true);
					}}
					onClose={() => setFiltersOpen(false)}
				/>
			) : null}
			{columnsOpen ? (
				<div
					role="dialog"
					aria-label="Columns"
					className="fixed inset-y-0 right-0 left-16 z-40 flex items-start justify-end bg-black/20 p-6 pt-24 xl:left-60"
				>
					<div className="flex w-60 flex-col gap-3 rounded-xl border border-border bg-card p-4">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={columns.category}
								onChange={(event) =>
									setColumns((current) => ({ ...current, category: event.target.checked }))
								}
							/>
							Category
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={columns.account}
								onChange={(event) =>
									setColumns((current) => ({ ...current, account: event.target.checked }))
								}
							/>
							Account
						</label>
						<button className={buttonClass} type="button" onClick={() => setColumnsOpen(false)}>
							Done
						</button>
					</div>
				</div>
			) : null}
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
			{categoriesOpen ? <CategoryManagerDrawer onClose={() => setCategoriesOpen(false)} /> : null}
			{bulkOpen ? (
				<BulkCategorizeDrawer
					transactionIds={[...selected]}
					onClose={() => setBulkOpen(false)}
					onDone={() => {
						setBulkOpen(false);
						stopSelecting();
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

function FiltersPanel({
	params,
	onPatch,
	onManageCategories,
	onClose,
}: {
	params: URLSearchParams;
	onPatch: (mutate: (next: URLSearchParams) => void) => void;
	onManageCategories: () => void;
	onClose: () => void;
}) {
	const accounts = useAccounts();
	const categories = useCategories();
	// The router commits URL changes in a transition, so controlled inputs bound to the URL
	// would snap back for a frame. Keep a local copy that updates at once and mirror it out.
	const [local, setLocal] = useState(() => new URLSearchParams(params));
	const accountIds = local.getAll("account");
	const categoryIds = local.getAll("category");

	function apply(mutate: (next: URLSearchParams) => void) {
		setLocal((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
		onPatch(mutate);
	}

	function toggle(key: string, id: string, on: boolean) {
		apply((next) => {
			const values = next.getAll(key).filter((value) => value !== id);
			next.delete(key);
			for (const value of on ? [...values, id] : values) next.append(key, value);
		});
	}

	function setValue(key: string, value: string) {
		apply((next) => {
			if (value) next.set(key, value);
			else next.delete(key);
		});
	}

	return (
		<div
			role="dialog"
			aria-label="Filters"
			className="fixed inset-y-0 right-0 left-16 z-40 flex items-start justify-end bg-black/20 p-6 pt-24 xl:left-60"
		>
			<div className="flex max-h-[70vh] w-80 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
				<fieldset className="flex flex-col gap-1 text-sm">
					<legend className="mb-1 font-medium">Accounts</legend>
					{(accounts.data ?? []).map((account) => (
						<label key={account.id} className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={accountIds.includes(account.id)}
								onChange={(event) => toggle("account", account.id, event.target.checked)}
							/>
							{account.name}
							{account.mask ? ` …${account.mask}` : ""}
						</label>
					))}
				</fieldset>
				<fieldset className="flex flex-col gap-1 text-sm">
					<legend className="mb-1 flex w-full items-center justify-between font-medium">
						Categories
					</legend>
					{(categories.data ?? []).map((category) => (
						<label key={category.id} className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={categoryIds.includes(category.id)}
								onChange={(event) => toggle("category", category.id, event.target.checked)}
							/>
							{category.name}
						</label>
					))}
					<button
						type="button"
						className="mt-1 flex items-center gap-1 self-start text-sm text-muted-foreground underline"
						onClick={onManageCategories}
					>
						<Settings2 aria-hidden className="size-4" />
						Manage categories
					</button>
				</fieldset>
				<label className="flex flex-col gap-1 text-sm" htmlFor="filter-pending">
					Status
					<select
						id="filter-pending"
						className={fieldClass}
						value={local.get("pending") ?? ""}
						onChange={(event) => setValue("pending", event.target.value)}
					>
						<option value="">Any</option>
						<option value="pending">Pending</option>
						<option value="posted">Posted</option>
					</select>
				</label>
				<div className="grid grid-cols-2 gap-2">
					<label className="flex flex-col gap-1 text-sm" htmlFor="filter-min">
						Min amount
						<input
							id="filter-min"
							className={fieldClass}
							inputMode="decimal"
							defaultValue={local.get("min") ?? ""}
							onBlur={(event) => setValue("min", event.target.value.trim())}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="filter-max">
						Max amount
						<input
							id="filter-max"
							className={fieldClass}
							inputMode="decimal"
							defaultValue={local.get("max") ?? ""}
							onBlur={(event) => setValue("max", event.target.value.trim())}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="filter-from">
						From
						<input
							id="filter-from"
							type="date"
							className={fieldClass}
							value={local.get("from") ?? ""}
							onChange={(event) => setValue("from", event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="filter-to">
						To
						<input
							id="filter-to"
							type="date"
							className={fieldClass}
							value={local.get("to") ?? ""}
							onChange={(event) => setValue("to", event.target.value)}
						/>
					</label>
				</div>
				<div className="flex gap-2">
					<button
						className={cn(buttonClass, "flex-1")}
						type="button"
						onClick={() =>
							apply((next) => {
								for (const key of ["account", "category", "pending", "min", "max", "from", "to"]) {
									next.delete(key);
								}
							})
						}
					>
						Clear
					</button>
					<button
						className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
						type="button"
						onClick={onClose}
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}
