import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { formatLongDate, formatSignedMoney } from "../../lib/format";
import type { TransactionListItem } from "../../types";
import { Amount } from "../ui/amount";
import { CategoryIcon } from "./category-icon";
import { MerchantLogo } from "./merchant-logo";

type Row =
	| { kind: "header"; key: string; date: string; net: number | null; currency: string }
	| { kind: "item"; key: string; item: TransactionListItem };

export type FeedColumns = { category: boolean; account: boolean };

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
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const element = listRef.current;
		if (element) {
			setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
		}
	}, []);

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
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
								<div className="flex items-center justify-between border-b border-border pt-4 pb-2 text-sm">
									<h2 className="font-medium">{formatLongDate(row.date)}</h2>
									{row.net !== null ? (
										<Amount className="text-muted-foreground">
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
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selecting ? checked : undefined}
			className={cn(
				"grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-1 py-3 text-left text-sm hover:bg-muted/50 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]",
				checked && "bg-muted",
			)}
		>
			<span className="flex items-center gap-2">
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
			<span className="flex min-w-0 items-center gap-2">
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
			<span
				className={cn(
					"hidden min-w-0 items-center gap-2 md:flex",
					!columns.category && "invisible",
				)}
			>
				{item.category ? (
					<>
						<CategoryIcon icon={item.category.icon} color={item.category.color} />
						<span className="truncate">{item.category.name}</span>
					</>
				) : null}
			</span>
			<span
				className={cn(
					"hidden min-w-0 items-center gap-2 text-muted-foreground md:flex",
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
			<Amount className={cn("text-right", item.amount > 0 && "text-positive")}>
				{formatSignedMoney(item.amount, item.isoCurrencyCode)}
			</Amount>
			<ChevronRight aria-hidden className="size-4 text-muted-foreground" />
		</button>
	);
}
