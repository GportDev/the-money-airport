import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Amount } from "@/components/ui/amount";
import { useDeleteFundEntry } from "@/hooks/use-goals";
import { cn } from "@/lib/cn";
import { formatLongDate, formatMoney, formatSignedMoney } from "@/lib/format";
import type { FundEntry } from "@/types";

type Props = {
	goalId: string;
	/** Newest first. */
	entries: FundEntry[];
	currency: string;
	isLoading: boolean;
	hasError: boolean;
};

const KIND_LABELS: Record<FundEntry["kind"], string> = {
	deposit: "Deposit",
	withdrawal: "Withdrawal",
	interest: "Interest",
};

export function FundEntryList({ goalId, entries, currency, isLoading, hasError }: Props) {
	const remove = useDeleteFundEntry();

	async function onDelete(entryId: string) {
		try {
			await remove.mutateAsync({ goalId, entryId });
			toast.success("Entry deleted");
		} catch (_error) {
			toast.error("Could not delete entry");
		}
	}

	if (hasError) {
		return (
			<p role="alert" className="px-4 text-sm text-negative">
				Could not load entries.
			</p>
		);
	}
	if (isLoading) {
		return <p className="px-4 text-sm text-muted-foreground">Loading…</p>;
	}
	if (entries.length === 0) {
		return <p className="px-4 text-sm text-muted-foreground">No entries yet.</p>;
	}
	return (
		<div className="flex flex-col gap-4 px-4 pb-4">
			{groupByDate(entries).map(([date, rows]) => (
				<section key={date} aria-label={formatLongDate(date)} className="flex flex-col">
					<h3 className="flex justify-between text-xs text-muted-foreground">
						<span>{formatLongDate(date)}</span>
						<Amount>{formatMoney(rows[0]?.balanceAfter ?? 0, currency)}</Amount>
					</h3>
					<ul>
						{rows.map((entry) => (
							<li
								key={entry.id}
								className="flex items-center gap-2 border-b border-border py-2 text-sm"
							>
								<span className="flex min-w-0 flex-1 flex-col">
									<span>{KIND_LABELS[entry.kind]}</span>
									{entry.note ? (
										<span className="truncate text-xs text-muted-foreground">{entry.note}</span>
									) : null}
								</span>
								<Amount className={cn(entry.amount > 0 && "text-positive")}>
									{formatSignedMoney(entry.amount, currency)}
								</Amount>
								<button
									type="button"
									aria-label="Delete entry"
									disabled={remove.isPending}
									onClick={() => void onDelete(entry.id)}
									className="rounded p-1 text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
								>
									<Trash2 aria-hidden className="size-4" />
								</button>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

/** Entries arrive newest first, so the first row of a date carries that day's closing balance. */
function groupByDate(entries: FundEntry[]) {
	const groups = new Map<string, FundEntry[]>();
	for (const entry of entries) {
		groups.set(entry.date, [...(groups.get(entry.date) ?? []), entry]);
	}
	return [...groups.entries()];
}
