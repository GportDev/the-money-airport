import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { cadenceLabel, countdownLabel } from "@/lib/recurring";
import type { RecurringListItem } from "@/types";

type Props = { item: RecurringListItem; onOpen: (item: RecurringListItem) => void };

export function RecurringRow({ item, onOpen }: Props) {
	const isOverdue = item.isActive && item.daysUntil < 0;
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(item)}
				className={cn(
					"flex w-full items-center gap-3 px-3 py-3 text-left text-sm row-hover",
					!item.isActive && "text-muted-foreground",
				)}
			>
				<MerchantLogo name={item.merchantName} url={item.merchantLogoUrl} />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-medium">{item.merchantName}</span>
					<span className="truncate text-xs text-muted-foreground">
						{cadenceLabel(item.cadence)}
						{item.account ? ` · ${item.account.name}` : ""}
					</span>
				</span>
				<span className={cn("hidden w-28 text-right sm:block", isOverdue && "text-negative")}>
					{item.isActive ? countdownLabel(item.daysUntil) : "Inactive"}
				</span>
				<Amount className="w-24 text-right">
					{formatMoney(item.amount, item.isoCurrencyCode)}
				</Amount>
			</button>
		</li>
	);
}
