import { X } from "lucide-react";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
		<li className="flex items-center gap-2 transition-[opacity,translate] duration-150 ease-out starting:-translate-y-0.5 starting:opacity-0 motion-reduce:starting:translate-y-0">
			<CategoryCombobox
				aria-label={`${label} category`}
				value={draft.categoryId}
				onValueChange={(categoryId) => onChange({ ...draft, categoryId })}
				className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 hover:border-border-strong"
			/>
			<Input
				aria-label={`${label} amount`}
				className="w-24 text-right tabular-nums"
				inputMode="decimal"
				placeholder="0.00"
				value={draft.amount}
				onChange={(event) => onChange({ ...draft, amount: event.target.value })}
			/>
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Remove ${label.toLowerCase()}`}
				className="text-muted-foreground hover:text-foreground disabled:invisible"
				disabled={!canRemove}
				onClick={onRemove}
			>
				<X aria-hidden className="size-4" />
			</Button>
		</li>
	);
}
