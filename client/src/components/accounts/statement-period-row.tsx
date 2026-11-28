import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteNotOnStatement, useKeepTransaction } from "@/hooks/use-statement-import";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import type { TransactionListItem } from "@/types";

type Props = { item: TransactionListItem };

/** A Statement period's Transaction; a Not on statement row offers Keep and Delete. */
export function StatementPeriodRow({ item }: Props) {
	return (
		<li className="flex flex-col gap-1 px-3 py-1.5">
			<span className="flex justify-between gap-2">
				<span className="truncate">
					<span className="text-muted-foreground">{shortDate(item.date)}</span> {item.name}
				</span>
				<Amount>{formatMoney(item.amount, item.isoCurrencyCode)}</Amount>
			</span>
			{item.isNotOnStatement ? <NotOnStatementActions item={item} /> : null}
		</li>
	);
}

function NotOnStatementActions({ item }: Props) {
	const keep = useKeepTransaction();
	const remove = useDeleteNotOnStatement();
	const [isConfirming, setConfirming] = useState(false);
	const isBusy = keep.isPending || remove.isPending;

	function onKeep() {
		keep.mutate(item.id, { onError: () => toast.error(`Could not keep ${item.name}`) });
	}

	function onDelete() {
		setConfirming(false);
		remove.mutate(item.id, { onError: () => toast.error(`Could not delete ${item.name}`) });
	}

	return (
		<span className="flex items-center gap-2">
			<Badge tone="warning">Not on statement</Badge>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={isBusy}
				aria-label={`Keep ${item.name}`}
				onClick={onKeep}
			>
				Keep
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={isBusy}
				aria-label={`Delete ${item.name}`}
				className="text-negative"
				onClick={() => setConfirming(true)}
			>
				Delete
			</Button>
			{isConfirming ? (
				<ConfirmDialog
					title={`Delete ${item.name}?`}
					onCancel={() => setConfirming(false)}
					onConfirm={onDelete}
				/>
			) : null}
		</span>
	);
}
