import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatLongDate, formatSignedMoney } from "@/lib/format";
import type { TransactionListItem } from "@/types";

type Props = { item: TransactionListItem; onOpen?: (id: string) => void };

/** One linked Transaction as a row that opens it: merchant, date, and amount. */
export function TransactionLink({ item, onOpen }: Props) {
	return (
		<button
			type="button"
			className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm row-hover"
			onClick={() => onOpen?.(item.id)}
		>
			<span className="flex min-w-0 flex-col">
				<span className="truncate">{item.merchantName ?? item.name}</span>
				<span className="text-xs text-muted-foreground">{formatLongDate(item.date)}</span>
			</span>
			<Amount className={cn("shrink-0", item.amount > 0 && "text-positive")}>
				{formatSignedMoney(item.amount, item.isoCurrencyCode)}
			</Amount>
		</button>
	);
}
