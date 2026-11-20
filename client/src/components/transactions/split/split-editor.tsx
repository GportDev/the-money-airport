import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { SplitPartRow } from "@/components/transactions/split/split-part-row";
import { SplitRemaining } from "@/components/transactions/split/split-remaining";
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
			<button
				type="button"
				className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-primary transition-colors hover:bg-primary/10"
				onClick={addDraft}
			>
				<Plus aria-hidden className="size-4" />
				Add part
			</button>
			<SplitRemaining
				total={total}
				remaining={remainingCents(total, drafts)}
				currency={transaction.isoCurrencyCode}
			/>
			<div className="flex gap-2">
				<button
					className="flex-1 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					type="submit"
					disabled={!isComplete || split.isPending}
				>
					Save split
				</button>
				{transaction.split ? (
					<button
						className="rounded-md border border-border px-3 py-2 text-negative transition-colors hover:bg-negative/10 disabled:opacity-60"
						type="button"
						disabled={unsplit.isPending}
						onClick={() => void onUnsplit()}
					>
						Unsplit
					</button>
				) : null}
				<button
					className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5"
					type="button"
					onClick={onDone}
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
