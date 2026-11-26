import { SplitEditor } from "@/components/transactions/split/split-editor";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useTransaction } from "@/hooks/use-transactions";
import { formatLongDate, formatSignedMoney } from "@/lib/format";

type Props = {
	transactionId: string | null;
	onClose: () => void;
};

/** The split editor in a centered modal, opened straight from a feed row or the drawer. */
export function SplitDialog({ transactionId, onClose }: Props) {
	const detail = useTransaction(transactionId);
	const transaction = detail.data;
	return (
		<Dialog open={transactionId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Split transaction</DialogTitle>
					{transaction ? (
						<DialogDescription>
							{transaction.merchantName ?? transaction.name} · {formatLongDate(transaction.date)} ·{" "}
							{formatSignedMoney(
								transaction.split?.total ?? transaction.amount,
								transaction.isoCurrencyCode,
							)}
						</DialogDescription>
					) : null}
				</DialogHeader>
				{transaction ? (
					<SplitEditor key={transaction.id} transaction={transaction} onDone={onClose} />
				) : detail.isError ? (
					<QueryError
						message="Could not load this Transaction."
						isRetrying={detail.isFetching}
						onRetry={() => void detail.refetch()}
					/>
				) : (
					<SkeletonGroup label="Loading split" className="flex flex-col gap-2">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
					</SkeletonGroup>
				)}
			</DialogContent>
		</Dialog>
	);
}
