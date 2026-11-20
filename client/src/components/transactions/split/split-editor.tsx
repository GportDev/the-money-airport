import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { SplitPartRow } from "@/components/transactions/split/split-part-row";
import { SplitRemaining } from "@/components/transactions/split/split-remaining";
import { Button } from "@/components/ui/button";
import { useSplitTransaction, useUnsplitTransaction } from "@/hooks/use-transactions";
import {
	initialSplitDrafts,
	isSplitComplete,
	MIN_SPLIT_PARTS,
	newSplitDraft,
	remainingCents,
	type SplitDraft,
	toSplitParts,
} from "@/lib/split";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail; onDone: () => void };

/** Edits the parts of a Transaction; Save stays off until they add up to the total. */
export function SplitEditor({ transaction, onDone }: Props) {
	const split = useSplitTransaction();
	const unsplit = useUnsplitTransaction();
	const [drafts, setDrafts] = useState<SplitDraft[]>(() => initialSplitDrafts(transaction));
	const total = transaction.split?.total ?? transaction.amount;
	const isComplete = isSplitComplete(total, drafts);

	function updateDraft(next: SplitDraft) {
		setDrafts((current) => current.map((draft) => (draft.key === next.key ? next : draft)));
	}

	function addDraft() {
		const remaining = Math.max(remainingCents(total, drafts), 0);
		setDrafts((current) => [...current, newSplitDraft(null, remaining)]);
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (!isComplete) return;
		try {
			await split.mutateAsync({ id: transaction.id, parts: toSplitParts(total, drafts) });
			toast.success(`Split into ${drafts.length} parts`);
			onDone();
		} catch (_error) {
			toast.error("Could not split. Try again.");
		}
	}

	async function onUnsplit() {
		try {
			await unsplit.mutateAsync(transaction.id);
			toast.success("Split removed");
			onDone();
		} catch (_error) {
			toast.error("Could not remove the split. Try again.");
		}
	}

	return (
		<form
			aria-label="Split transaction"
			className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-sm"
			onSubmit={onSubmit}
		>
			<ul className="flex flex-col gap-2">
				{drafts.map((draft, index) => (
					<SplitPartRow
						key={draft.key}
						draft={draft}
						index={index}
						canRemove={drafts.length > MIN_SPLIT_PARTS}
						onChange={updateDraft}
						onRemove={() => setDrafts((current) => current.filter((row) => row.key !== draft.key))}
					/>
				))}
			</ul>
			<Button variant="ghost" size="sm" className="self-start" onClick={addDraft}>
				<Plus aria-hidden className="size-3.5" />
				Add part
			</Button>
			<SplitRemaining
				total={total}
				remaining={remainingCents(total, drafts)}
				currency={transaction.isoCurrencyCode}
			/>
			<div className="flex gap-2">
				<Button type="submit" className="flex-1" disabled={!isComplete || split.isPending}>
					Save split
				</Button>
				{transaction.split ? (
					<Button
						variant="danger-outline"
						disabled={unsplit.isPending}
						onClick={() => void onUnsplit()}
					>
						Unsplit
					</Button>
				) : null}
				<Button variant="outline" onClick={onDone}>
					Cancel
				</Button>
			</div>
		</form>
	);
}
