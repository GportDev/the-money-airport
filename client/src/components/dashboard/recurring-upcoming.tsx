import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import { cadenceLabel, countdownLabel } from "@/lib/recurring";
import type { RecurringListItem } from "@/types";

/** The Dashboard's truncated view of the Recurring list (PRD F9.5). */
export function RecurringUpcoming({ items }: { items: RecurringListItem[] }) {
	if (items.length === 0) {
		return <p className="text-sm text-muted-foreground">No recurring bills yet.</p>;
	}
	return (
		<ul className="flex flex-col gap-3">
			{items.map((item) => (
				<li key={item.id} className="flex items-center gap-3 text-sm">
					<MerchantLogo name={item.merchantName} url={item.merchantLogoUrl} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate font-medium">{item.merchantName}</span>
						<span className="truncate text-xs text-muted-foreground">
							{cadenceLabel(item.cadence)} · {countdownLabel(item.daysUntil)}
						</span>
					</span>
					<Amount>{formatMoney(item.amount, item.isoCurrencyCode)}</Amount>
				</li>
			))}
		</ul>
	);
}
