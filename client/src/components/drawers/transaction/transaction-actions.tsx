import { ListChecks, Split, Undo2 } from "lucide-react";
import { AssignToFund } from "@/components/transactions/assign-to-fund";
import { CreateRule } from "@/components/transactions/create-rule";
import { canMarkAsRefund, RefundPicker } from "@/components/transactions/transaction-refund";
import { Button } from "@/components/ui/button";
import type { TransactionDetail } from "@/types";

export type ActionPanel = "refund" | "rule" | "fund" | null;

type Props = {
	transaction: TransactionDetail;
	panel: ActionPanel;
	onPanelChange: (panel: ActionPanel) => void;
	onSplit: () => void;
};

/** One row of compact actions; Refund, Rule and Fund open their panel right under the row. */
export function TransactionActions({ transaction, panel, onPanelChange, onSplit }: Props) {
	const close = () => onPanelChange(null);
	return (
		<div className="flex flex-col gap-3 px-4">
			<div className="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" type="button" onClick={onSplit}>
					<Split aria-hidden className="size-3.5" />
					{transaction.split ? "Edit split" : "Split"}
				</Button>
				{canMarkAsRefund(transaction) ? (
					<Button
						variant="outline"
						size="sm"
						type="button"
						aria-expanded={panel === "refund"}
						onClick={() => onPanelChange(panel === "refund" ? null : "refund")}
					>
						<Undo2 aria-hidden className="size-3.5" />
						Mark as refund
					</Button>
				) : null}
				<Button
					variant="outline"
					size="sm"
					type="button"
					aria-expanded={panel === "rule"}
					onClick={() => onPanelChange(panel === "rule" ? null : "rule")}
				>
					<ListChecks aria-hidden className="size-3.5" />
					Create rule
				</Button>
			</div>
			<div className="flex flex-col empty:hidden [&>*]:animate-pop-in">
				{panel === "refund" ? <RefundPicker transaction={transaction} onClose={close} /> : null}
				{panel === "rule" ? <CreateRule transaction={transaction} onClose={close} /> : null}
				{panel === "fund" ? <AssignToFund transaction={transaction} onClose={close} /> : null}
			</div>
		</div>
	);
}
