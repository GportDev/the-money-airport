import { X } from "lucide-react";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import type { SplitDraft } from "@/lib/split";

type Props = {
	draft: SplitDraft;
	index: number;
	canRemove: boolean;
	onChange: (draft: SplitDraft) => void;
	onRemove: () => void;
};

export function SplitPartRow({ draft, index, canRemove, onChange, onRemove }: Props) {
	const label = `Part ${index + 1}`;
	return (
		<li className="flex items-center gap-2">
			<CategoryCombobox
				aria-label={`${label} category`}
				value={draft.categoryId}
				onValueChange={(categoryId) => onChange({ ...draft, categoryId })}
				className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 hover:border-foreground/30"
			/>
			<input
				aria-label={`${label} amount`}
				className="w-24 rounded-md border border-border bg-card px-3 py-2 text-right tabular-nums transition-colors hover:border-foreground/30"
				inputMode="decimal"
				placeholder="0.00"
				value={draft.amount}
				onChange={(event) => onChange({ ...draft, amount: event.target.value })}
			/>
			<button
				type="button"
				aria-label={`Remove ${label.toLowerCase()}`}
				className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:invisible"
				disabled={!canRemove}
				onClick={onRemove}
			>
				<X aria-hidden className="size-4" />
			</button>
		</li>
	);
}
