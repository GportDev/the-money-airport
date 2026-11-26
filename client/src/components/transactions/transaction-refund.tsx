import { toast } from "sonner";
import { TransactionLink } from "@/components/transactions/transaction-link";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useLinkRefund, useRefundCandidates, useUnlinkRefund } from "@/hooks/use-transactions";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail; onOpen?: (id: string) => void };

/** Drawer section: the refund links a Transaction already has (refund of, refunded by). */
export function TransactionRefund({ transaction, onOpen }: Props) {
	const { of, refundedBy } = transaction.refund;
	if (of) {
		return <RefundOf transaction={transaction} onOpen={onOpen} />;
	}
	if (refundedBy.length > 0) {
		return (
			<section aria-labelledby="refund-heading" className="flex flex-col gap-1 px-4">
				<h3 id="refund-heading" className="text-sm font-medium">
					Refunded by
				</h3>
				{refundedBy.map((item) => (
					<TransactionLink key={item.id} item={item} onOpen={onOpen} />
				))}
			</section>
		);
	}
	return null;
}

/** Money coming in with no refund links yet can be marked as the refund of an expense. */
export function canMarkAsRefund(transaction: TransactionDetail) {
	const { of, refundedBy } = transaction.refund;
	return transaction.amount > 0 && !of && refundedBy.length === 0;
}

function RefundOf({ transaction, onOpen }: Props) {
	const unlink = useUnlinkRefund();
	const original = transaction.refund.of;
	if (!original) return null;
	return (
		<section aria-labelledby="refund-heading" className="flex flex-col gap-1 px-4">
			<div className="flex items-center justify-between gap-2">
				<h3 id="refund-heading" className="text-sm font-medium">
					Refund of
				</h3>
				<Button
					variant="outline"
					size="sm"
					disabled={unlink.isPending}
					onClick={() =>
						unlink.mutate(transaction.id, {
							onSuccess: () => toast.success("Refund link removed"),
							onError: () => toast.error("Could not remove the refund link"),
						})
					}
				>
					Unlink
				</Button>
			</div>
			<TransactionLink item={original} onOpen={onOpen} />
		</section>
	);
}

/** Drawer panel: pick the expense this money refunds. */
export function RefundPicker({
	transaction,
	onClose,
}: {
	transaction: TransactionDetail;
	onClose: () => void;
}) {
	const candidates = useRefundCandidates(transaction.id, true);
	const link = useLinkRefund();

	function onPick(originalId: string, label: string) {
		link.mutate(
			{ id: transaction.id, originalId },
			{
				onSuccess: () => {
					toast.success(`Linked as a refund of ${label}`);
					onClose();
				},
				onError: () => toast.error("Could not link the refund"),
			},
		);
	}

	return (
		<section
			aria-label="Refund"
			className="flex flex-col gap-2 rounded-xl bg-foreground/[0.03] p-3"
		>
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-medium">Which expense does this refund?</h3>
				<Button variant="ghost" size="sm" onClick={onClose}>
					Cancel
				</Button>
			</div>
			{candidates.isPending ? (
				<SkeletonGroup label="Loading expenses" className="flex flex-col gap-2">
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
				</SkeletonGroup>
			) : candidates.isError ? (
				<p role="alert" className="text-sm text-negative">
					Could not load expenses.
				</p>
			) : (candidates.data ?? []).length === 0 ? (
				<p className="text-sm text-muted-foreground">No expenses in the last 120 days fit.</p>
			) : (
				<ul aria-label="Expenses this may refund" className="flex flex-col">
					{(candidates.data ?? []).map((item) => (
						<li key={item.id}>
							<TransactionLink
								item={item}
								onOpen={() => onPick(item.id, item.merchantName ?? item.name)}
							/>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
