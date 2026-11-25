import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { TransactionLink } from "@/components/transactions/transaction-link";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";
import { useTransactionFeed } from "@/hooks/use-transactions";
import { netWorthRangeStart } from "@/lib/net-worth-range";
import type { BankAccount } from "@/types";

type Props = { account: BankAccount; range: string };

/** Account drawer section: this BankAccount's Transactions in the page's timeframe. */
export function AccountTransactions({ account, range }: Props) {
	const navigate = useNavigate();
	const dateFrom = netWorthRangeStart(range);
	const filters = useMemo(() => ({ accountIds: [account.id], dateFrom }), [account.id, dateFrom]);
	const feed = useTransactionFeed(filters);
	const items = feed.data?.pages.flatMap((page) => page.data) ?? [];
	const feedPath = `/transactions?${new URLSearchParams({ account: account.id, from: dateFrom })}`;

	return (
		<section
			aria-labelledby="account-transactions-heading"
			className="flex flex-col gap-2 px-4 pb-6"
		>
			<div className="flex items-center justify-between gap-2">
				<h3 id="account-transactions-heading" className="text-sm font-medium">
					Transactions
				</h3>
				<Button variant="outline" size="sm" asChild>
					<Link to={feedPath}>Open in Transactions</Link>
				</Button>
			</div>
			{feed.isPending ? (
				<SkeletonGroup label="Loading transactions">
					<SkeletonRows count={3} />
				</SkeletonGroup>
			) : feed.isError ? (
				<QueryError
					message="Could not load this account's transactions."
					isRetrying={feed.isFetching}
					onRetry={() => void feed.refetch()}
				/>
			) : items.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					No transactions in this timeframe.
				</p>
			) : (
				<>
					<ul aria-label={`${account.name} transactions`} className="flex flex-col">
						{items.map((item) => (
							<li key={item.id} className="border-b border-border">
								<TransactionLink item={item} onOpen={() => navigate(feedPath)} />
							</li>
						))}
					</ul>
					{feed.hasNextPage ? (
						<Button
							variant="outline"
							size="sm"
							disabled={feed.isFetchingNextPage}
							onClick={() => void feed.fetchNextPage()}
						>
							{feed.isFetchingNextPage ? "Loading…" : "Show more"}
						</Button>
					) : null}
				</>
			)}
		</section>
	);
}
