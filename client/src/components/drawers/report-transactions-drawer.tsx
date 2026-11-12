import { useMemo, useRef } from "react";
import { ScrollContainerContext } from "@/components/layout/scroll-container";
import { TransactionFeed } from "@/components/transactions/transaction-feed";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useTransactionFeed } from "@/hooks/use-transactions";
import type { TransactionFilters } from "@/types";

type Props = {
	title: string;
	description: string;
	filters: TransactionFilters;
	onClose: () => void;
	onOpenTransaction: (id: string) => void;
};

/** A chart segment's Transactions: the feed, filtered, in a drawer that scrolls on its own. */
export function ReportTransactionsDrawer({
	title,
	description,
	filters,
	onClose,
	onOpenTransaction,
}: Props) {
	const feed = useTransactionFeed(filters);
	const items = useMemo(() => feed.data?.pages.flatMap((page) => page.data) ?? [], [feed.data]);
	const scrollRef = useRef<HTMLDivElement>(null);
	return (
		<Sheet onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<ScrollContainerContext.Provider value={scrollRef}>
					<div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-4">
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
								onOpen={(item) => onOpenTransaction(item.id)}
								emptyMessage="No transactions in this range."
							/>
						)}
					</div>
				</ScrollContainerContext.Provider>
			</SheetContent>
		</Sheet>
	);
}
