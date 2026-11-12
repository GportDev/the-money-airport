import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { formatLongDate, formatSignedMoney } from "../../lib/format";
import type { TransactionListItem } from "../../types";
import { useScrollContainer } from "../layout/scroll-container";
import { Amount } from "../ui/amount";
import { CategorySelect } from "./category-select";
import { MerchantLogo } from "./merchant-logo";

type Row =
	| { kind: "header"; key: string; date: string; net: number | null; currency: string }
	| { kind: "item"; key: string; item: TransactionListItem };

export type FeedColumns = { category: boolean; account: boolean };

// Fixed trailing columns so every row and date header lines up: text columns read left to
// right, and the amount column has a fixed width with its numbers right-aligned.
const ROW_GRID =
	"grid-cols-[auto_minmax(0,1fr)_8rem_1rem] md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_1rem]";
const HEADER_GRID = "grid-cols-[minmax(0,1fr)_8rem_1rem]";

function isTransfer(item: TransactionListItem) {
	return item.tags.includes("transfer") || item.tags.includes("savings_transfer");
}

/** Flat chronological list in, date-grouped rows out. Day net skips Transfers. */
function groupByDate(items: TransactionListItem[]): Row[] {
	const rows: Row[] = [];
	let index = 0;
	while (index < items.length) {
		const date = items[index]?.date ?? "";
		const day: TransactionListItem[] = [];
		while (index < items.length && items[index]?.date === date) {
			const item = items[index];
			if (item) day.push(item);
			index += 1;
		}
		const currencies = new Set(day.map((item) => item.isoCurrencyCode));
		const net =
			currencies.size === 1
				? day.filter((item) => !isTransfer(item)).reduce((sum, item) => sum + item.amount, 0)
				: null;
		rows.push({
			kind: "header",
			key: `header-${date}`,
			date,
			net,
			currency: day[0]?.isoCurrencyCode ?? "USD",
		});
		for (const item of day) {
			rows.push({ kind: "item", key: item.id, item });
		}
	}
	return rows;
}

export function TransactionFeed({
	items,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	onOpen,
	columns = { category: true, account: true },
	selecting = false,
	selected,
	onToggle,
	emptyMessage = "No transactions yet.",
}: {
	items: TransactionListItem[];
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
	onOpen: (item: TransactionListItem) => void;
	columns?: FeedColumns;
	selecting?: boolean;
	selected?: Set<string>;
	onToggle?: (id: string) => void;
	emptyMessage?: string;
}) {
	const rows = useMemo(() => groupByDate(items), [items]);
	const listRef = useRef<HTMLDivElement>(null);
	const scrollRef = useScrollContainer();
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const element = listRef.current;
		const container = scrollRef.current;
		if (element && container) {
			// Offset of the list inside the scrolling content area, not the window.
			setScrollMargin(
				element.getBoundingClientRect().top -
					container.getBoundingClientRect().top +
					container.scrollTop,
			);
		}
	}, [scrollRef]);

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => (rows[index]?.kind === "header" ? 40 : 60),
		overscan: 8,
		scrollMargin,
		getItemKey: (index) => rows[index]?.key ?? index,
	});
	const virtualRows = virtualizer.getVirtualItems();
	const lastIndex = virtualRows.at(-1)?.index ?? -1;

	useEffect(() => {
		if (hasNextPage && !isFetchingNextPage && lastIndex >= rows.length - 6) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, lastIndex, rows.length, fetchNextPage]);

	if (items.length === 0) {
		return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
	}

	return (
		<div ref={listRef}>
			<ul
				aria-label="Transactions"
				className="relative"
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualRows.map((virtual) => {
					const row = rows[virtual.index];
					if (!row) return null;
					return (
						<li
							key={virtual.key}
							data-index={virtual.index}
							ref={virtualizer.measureElement}
							className="absolute top-0 left-0 w-full"
							style={{ transform: `translateY(${virtual.start - scrollMargin}px)` }}
						>
							{row.kind === "header" ? (
								<div
									className={cn(
										"grid items-center gap-3 border-b border-border px-1 pt-4 pb-2 text-sm",
										HEADER_GRID,
									)}
								>
									<h2 className="font-medium">{formatLongDate(row.date)}</h2>
									{row.net !== null ? (
										<Amount className="text-right text-muted-foreground">
											{formatSignedMoney(row.net, row.currency)}
										</Amount>
									) : null}
								</div>
							) : (
								<FeedRow
									item={row.item}
									columns={columns}
									selecting={selecting}
									checked={selected?.has(row.item.id) ?? false}
									onClick={() => (selecting ? onToggle?.(row.item.id) : onOpen(row.item))}
								/>
							)}
						</li>
					);
				})}
			</ul>
			{isFetchingNextPage ? (
				<p className="py-4 text-center text-sm text-muted-foreground">Loading more…</p>
			) : null}
		</div>
	);
}

function FeedRow({
	item,
	columns,
	selecting,
	checked,
	onClick,
}: {
	item: TransactionListItem;
	columns: FeedColumns;
	selecting: boolean;
	checked: boolean;
	onClick: () => void;
}) {
	const title = item.merchantName ?? item.name;
	const accountLabel = item.account
		? `${item.account.name}${item.account.mask ? ` …${item.account.mask}` : ""}`
		: "Manual";
	const amount = formatSignedMoney(item.amount, item.isoCurrencyCode);
	// The row is one big button laid under the cells, so the Category picker can sit on top
	// of it without nesting interactive elements. Its name reads the row like the old button.
	const rowLabel = [
		title,
		item.pending ? "Pending" : null,
		isTransfer(item) ? "Transfer" : null,
		item.category?.name,
		accountLabel,
		amount,
	]
		.filter(Boolean)
		.join(", ");
	return (
		<div
			className={cn(
				"relative grid w-full items-center gap-3 border-b border-border px-1 py-3 text-left text-sm transition-colors hover:bg-foreground/5",
				ROW_GRID,
				checked ? "bg-muted" : isTransfer(item) && "bg-muted/40",
			)}
		>
			<button
				type="button"
				onClick={onClick}
				aria-pressed={selecting ? checked : undefined}
				aria-label={rowLabel}
				className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
			/>
			<span className="pointer-events-none flex items-center gap-2">
				{selecting ? (
					<input
						type="checkbox"
						checked={checked}
						readOnly
						tabIndex={-1}
						aria-label={`Select ${title}`}
					/>
				) : null}
				<MerchantLogo name={title} url={item.merchantLogoUrl} />
			</span>
			<span className="pointer-events-none flex min-w-0 items-center gap-2">
				<span className="truncate">{title}</span>
				{item.pending ? (
					<span className="shrink-0 rounded-sm border border-border px-1.5 text-xs text-muted-foreground">
						Pending
					</span>
				) : null}
				{isTransfer(item) ? (
					<ArrowLeftRight
						aria-label="Transfer"
						className="size-3.5 shrink-0 text-muted-foreground"
					/>
				) : null}
			</span>
			<span className={cn("relative hidden min-w-0 md:flex", !columns.category && "invisible")}>
				<CategorySelect
					transactionId={item.id}
					category={item.category}
					label={`Category for ${title}`}
				/>
			</span>
			<span
				className={cn(
					"pointer-events-none hidden min-w-0 items-center gap-2 text-muted-foreground md:flex",
					!columns.account && "invisible",
				)}
			>
				{item.account ? (
					<>
						{item.account.institutionLogo ? (
							<img
								src={`data:image/png;base64,${item.account.institutionLogo}`}
								alt=""
								className="size-4 rounded-sm"
							/>
						) : null}
						<span className="truncate">
							{item.account.name}
							{item.account.mask ? ` …${item.account.mask}` : ""}
						</span>
					</>
				) : (
					<span>Manual</span>
				)}
			</span>
			<Amount className={cn("pointer-events-none text-right", item.amount > 0 && "text-positive")}>
				{amount}
			</Amount>
			<ChevronRight aria-hidden className="pointer-events-none size-4 text-muted-foreground" />
		</div>
	);
}
