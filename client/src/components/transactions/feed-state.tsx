import type { ReactNode } from "react";
import { TransactionFeedSkeleton } from "@/components/transactions/transaction-feed-skeleton";
import { QueryError } from "@/components/ui/query-error";

type Props = {
	feed: { isPending: boolean; isError: boolean; isFetching: boolean; refetch: () => unknown };
	isEmpty: boolean;
	/** Shown when the feed loaded with no rows. */
	empty: ReactNode;
	children: ReactNode;
};

/** Picks what a transaction feed area shows: skeleton, error with retry, empty state, or rows. */
export function FeedState({ feed, isEmpty, empty, children }: Props) {
	if (feed.isPending) return <TransactionFeedSkeleton />;
	if (feed.isError) {
		return (
			<QueryError
				message="Could not load transactions."
				isRetrying={feed.isFetching}
				onRetry={() => void feed.refetch()}
			/>
		);
	}
	return isEmpty ? empty : children;
}
