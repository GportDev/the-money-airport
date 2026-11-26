import { useState } from "react";
import { toast } from "sonner";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaveTransactionRule } from "@/hooks/use-transaction-rules";
import { formatSignedMoney } from "@/lib/format";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail; onClose: () => void };

/** Drawer panel: a rule that files every Transaction like this one in a Category. */
export function CreateRule({ transaction, onClose }: Props) {
	const save = useSaveTransactionRule();
	const [categoryId, setCategoryId] = useState(transaction.category?.id ?? null);
	const [matchAmount, setMatchAmount] = useState(false);
	const merchant = transaction.merchantName ?? transaction.name;
	const amount = formatSignedMoney(transaction.amount, transaction.isoCurrencyCode);

	function onSave() {
		if (!categoryId) return;
		save.mutate(
			{ merchant, amount: matchAmount ? transaction.amount : null, categoryId },
			{
				onSuccess: ({ applied }) => {
					toast.success(
						`Rule saved. ${applied} ${applied === 1 ? "transaction" : "transactions"} updated.`,
					);
					onClose();
				},
				onError: () => toast.error("Could not save the rule"),
			},
		);
	}

	return (
		<section aria-labelledby="rule-heading" className="flex flex-col gap-2">
			<h3 id="rule-heading" className="sr-only">
				Rule
			</h3>

			<div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.03] p-3 text-sm">
				<label className="flex flex-col gap-1" htmlFor="rule-category">
					{`Always put ${merchant} in`}
					<CategoryCombobox
						id="rule-category"
						value={categoryId}
						onValueChange={setCategoryId}
						className="h-9 rounded-lg border border-border bg-card px-3 hover:border-border-strong"
					/>
				</label>
				<label className="flex items-center gap-2" htmlFor="rule-match-amount">
					<Checkbox
						id="rule-match-amount"
						checked={matchAmount}
						onCheckedChange={(next) => setMatchAmount(next === true)}
					/>
					{`Only when the amount is ${amount}`}
				</label>
				<div className="flex gap-2">
					<Button className="flex-1" disabled={!categoryId || save.isPending} onClick={onSave}>
						{save.isPending ? "Saving…" : "Save rule"}
					</Button>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</div>
		</section>
	);
}
