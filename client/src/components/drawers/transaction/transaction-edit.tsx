import { useState } from "react";
import {
	type ActionPanel,
	TransactionActions,
} from "@/components/drawers/transaction/transaction-actions";
import { TransactionHeader } from "@/components/drawers/transaction/transaction-header";
import { TransactionProperties } from "@/components/drawers/transaction/transaction-properties";
import { TransactionSimilar } from "@/components/drawers/transaction/transaction-similar";
import { useAssignableFunds } from "@/components/transactions/assign-to-fund";
import { SplitDialog } from "@/components/transactions/split/split-dialog";
import { TransactionRefund } from "@/components/transactions/transaction-refund";
import { Amount } from "@/components/ui/amount";
import { InlineNote } from "@/components/ui/inline-note";
import { InlineText } from "@/components/ui/inline-text";
import { useSaveTransaction } from "@/hooks/use-save-transaction";
import { cn } from "@/lib/cn";
import { centsToMajorUnits, formatSignedMoney, majorUnitsToCents } from "@/lib/format";
import type { TransactionDetail } from "@/types";

type Props = {
	transaction: TransactionDetail;
	onDelete?: (transaction: TransactionDetail) => void;
	onOpenSimilar?: (id: string) => void;
	/** Called after any field of this Transaction saves. */
	onChanged?: (id: string) => void;
};

/** The detail view: every value is shown once, where it is edited, and saves on its own. */
export function TransactionEdit({ transaction, onDelete, onOpenSimilar, onChanged }: Props) {
	const onSaved = () => onChanged?.(transaction.id);
	const { saveOrThrow } = useSaveTransaction(transaction.id, onSaved);
	const [panel, setPanel] = useState<ActionPanel>(null);
	const [isSplitOpen, setSplitOpen] = useState(false);
	const funds = useAssignableFunds(transaction);
	const menu = [
		...(funds.length > 0 ? [{ label: "Assign to Fund", onSelect: () => setPanel("fund") }] : []),
		...(transaction.isManual && onDelete
			? [{ label: "Delete transaction", onSelect: () => onDelete(transaction), isDanger: true }]
			: []),
	];

	return (
		<>
			<TransactionHeader
				transaction={transaction}
				onRename={(name) => saveOrThrow({ name })}
				menu={menu}
			/>
			<div className="-mt-2 flex flex-col gap-1 px-4">
				<TransactionAmount transaction={transaction} onSaved={onSaved} />
				<InlineNote
					aria-label="Notes"
					value={transaction.notes ?? ""}
					onCommit={(notes) => saveOrThrow({ notes: notes === "" ? null : notes })}
					className="-mx-2 w-[calc(100%+1rem)]"
				/>
			</div>
			<TransactionProperties transaction={transaction} onSaved={onSaved} />
			<TransactionRefund transaction={transaction} onOpen={onOpenSimilar} />
			<TransactionActions
				transaction={transaction}
				panel={panel}
				onPanelChange={setPanel}
				onSplit={() => setSplitOpen(true)}
			/>
			<TransactionSimilar transaction={transaction} onOpen={onOpenSimilar} />
			<SplitDialog
				transactionId={isSplitOpen ? transaction.id : null}
				onClose={() => setSplitOpen(false)}
				onSaved={onSaved}
			/>
		</>
	);
}

/** Bank amounts are read-only; a manual, unsplit Transaction's amount is edited in place. */
function TransactionAmount({
	transaction,
	onSaved,
}: {
	transaction: TransactionDetail;
	onSaved: () => void;
}) {
	const { saveOrThrow } = useSaveTransaction(transaction.id, onSaved);
	if (transaction.isManual && !transaction.split) {
		return (
			<InlineText
				aria-label="Amount"
				size="amount"
				inputMode="decimal"
				value={centsToMajorUnits(transaction.amount)}
				onCommit={(value) => saveOrThrow({ amount: majorUnitsToCents(value) })}
				className={cn("-ml-2", transaction.amount > 0 && "text-positive")}
			/>
		);
	}
	return (
		<Amount
			className={cn(
				"text-[28px] leading-tight tracking-[-0.03em]",
				transaction.amount > 0 && "text-positive",
			)}
		>
			{formatSignedMoney(transaction.amount, transaction.isoCurrencyCode)}
		</Amount>
	);
}
