import { toast } from "sonner";
import { Amount } from "@/components/ui/amount";
import { useMarkRecurringPaid, useSkipRecurring } from "@/hooks/use-recurring";
import { formatLongDate, formatMoney } from "@/lib/format";
import { countdownLabel } from "@/lib/recurring";
import type { RecurringListItem } from "@/types";

type Props = { item: RecurringListItem; onDone: () => void };

/** Next payment with Mark paid and Skip; both only move the schedule, no Transaction is added. */
export function RecurringSchedule({ item, onDone }: Props) {
	const markPaid = useMarkRecurringPaid();
	const skip = useSkipRecurring();
	const isBusy = markPaid.isPending || skip.isPending;

	async function onMarkPaid() {
		try {
			const next = await markPaid.mutateAsync(item.id);
			toast.success(`${item.merchantName} paid · next ${formatLongDate(next.nextDate)}`);
			onDone();
		} catch (_error) {
			toast.error(`Could not mark ${item.merchantName} paid`);
		}
	}

	async function onSkip() {
		try {
			const next = await skip.mutateAsync(item.id);
			toast.success(`Skipped · next ${formatLongDate(next.nextDate)}`);
			onDone();
		} catch (_error) {
			toast.error(`Could not skip ${item.merchantName}`);
		}
	}

	return (
		<div className="mx-4 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-sm">
			<div className="flex items-baseline justify-between gap-2">
				<span>
					Next {formatLongDate(item.nextDate)}{" "}
					<span className="text-muted-foreground">({countdownLabel(item.daysUntil)})</span>
				</span>
				<Amount>{formatMoney(item.amount, item.isoCurrencyCode)}</Amount>
			</div>
			{item.lastPaidOn ? (
				<p className="text-xs text-muted-foreground">Last paid {formatLongDate(item.lastPaidOn)}</p>
			) : null}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={isBusy}
					onClick={() => void onMarkPaid()}
					className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
				>
					{markPaid.isPending ? "Marking…" : "Mark paid"}
				</button>
				<button
					type="button"
					disabled={isBusy}
					onClick={() => void onSkip()}
					className="flex-1 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
				>
					{skip.isPending ? "Skipping…" : "Skip"}
				</button>
			</div>
		</div>
	);
}
