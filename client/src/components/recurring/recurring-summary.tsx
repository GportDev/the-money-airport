import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { RecurringMonth } from "@/types";

/** Remaining due vs already paid this month, in Base currency. */
export function RecurringSummary({ month }: { month: RecurringMonth }) {
	return (
		<p className="text-sm text-muted-foreground">
			<Amount className="text-lg font-semibold text-foreground">
				{formatMoney(month.remainingDue, month.baseCurrency)}
			</Amount>{" "}
			remaining due this month ·{" "}
			<Amount className="text-foreground">{formatMoney(month.paid, month.baseCurrency)}</Amount>{" "}
			paid
		</p>
	);
}
