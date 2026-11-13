import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { useCreateFundEntry } from "@/hooks/use-goals";
import { majorUnitsToCents, todayIso } from "@/lib/format";
import type { FundEntryKind } from "@/types";

const KIND_OPTIONS: { value: FundEntryKind; label: string }[] = [
	{ value: "deposit", label: "Deposit" },
	{ value: "withdrawal", label: "Withdrawal" },
	{ value: "interest", label: "Interest" },
];

type Props = { goalId: string; onDone: () => void };

/** Amounts are typed as positive numbers; a withdrawal is stored negative. */
export function FundEntryForm({ goalId, onDone }: Props) {
	const create = useCreateFundEntry();
	const [kind, setKind] = useState<FundEntryKind>("deposit");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(todayIso());
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const cents = majorUnitsToCents(amount);
		if (!Number.isFinite(cents) || cents <= 0) {
			setError("Enter an amount above 0.");
			return;
		}
		setError(null);
		try {
			await create.mutateAsync({
				goalId,
				kind,
				date,
				amount: kind === "withdrawal" ? -cents : cents,
				note: note.trim() || null,
			});
			toast.success("Entry added");
			onDone();
		} catch (_error) {
			toast.error("Could not add entry");
		}
	}

	return (
		<form
			className="mx-4 flex flex-col gap-3 rounded-xl border border-border p-3"
			onSubmit={onSubmit}
		>
			<Segmented
				aria-label="Entry kind"
				value={kind}
				options={KIND_OPTIONS}
				onValueChange={setKind}
			/>
			<label className="flex flex-col gap-1 text-sm" htmlFor="fund-entry-amount">
				Amount
				<input
					id="fund-entry-amount"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type="number"
					inputMode="decimal"
					min="0"
					step="0.01"
					placeholder="0.00"
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					aria-invalid={Boolean(error)}
				/>
			</label>
			<label className="flex flex-col gap-1 text-sm" htmlFor="fund-entry-date">
				Date
				<input
					id="fund-entry-date"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type="date"
					value={date}
					onChange={(event) => setDate(event.target.value)}
					required
				/>
			</label>
			<label className="flex flex-col gap-1 text-sm" htmlFor="fund-entry-note">
				Note
				<input
					id="fund-entry-note"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					value={note}
					onChange={(event) => setNote(event.target.value)}
				/>
			</label>
			{error ? (
				<p role="alert" className="text-sm text-negative">
					{error}
				</p>
			) : null}
			<button
				type="submit"
				disabled={create.isPending}
				className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
			>
				{create.isPending ? "Saving…" : "Save entry"}
			</button>
		</form>
	);
}
