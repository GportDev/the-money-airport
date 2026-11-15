import { Segmented } from "@/components/ui/segmented";
import { CADENCE_OPTIONS, type RecurringDraft } from "@/lib/recurring";

type Props = {
	draft: RecurringDraft;
	onChange: (draft: RecurringDraft) => void;
	error: string | null;
};

/** Amount, cadence, and next date: the schedule both the add and edit drawers share. */
export function RecurringFields({ draft, onChange, error }: Props) {
	return (
		<>
			<label className="flex flex-col gap-1 text-sm" htmlFor="recurring-amount">
				Amount
				<input
					id="recurring-amount"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type="number"
					inputMode="decimal"
					min="0.01"
					step="0.01"
					placeholder="0.00"
					value={draft.amount}
					onChange={(event) => onChange({ ...draft, amount: event.target.value })}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? "recurring-error" : undefined}
				/>
			</label>
			<div className="flex flex-col gap-1 text-sm">
				<span id="recurring-cadence-label">Cadence</span>
				<Segmented
					aria-label="Cadence"
					value={draft.cadence}
					options={CADENCE_OPTIONS}
					onValueChange={(cadence) => onChange({ ...draft, cadence })}
					className="self-start"
				/>
			</div>
			<label className="flex flex-col gap-1 text-sm" htmlFor="recurring-next-date">
				Next date
				<input
					id="recurring-next-date"
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type="date"
					value={draft.nextDate}
					onChange={(event) => onChange({ ...draft, nextDate: event.target.value })}
				/>
			</label>
			{error ? (
				<p id="recurring-error" role="alert" className="text-sm text-negative">
					{error}
				</p>
			) : null}
		</>
	);
}
