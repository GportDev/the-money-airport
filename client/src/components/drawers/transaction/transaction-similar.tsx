import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatLongDate, formatSignedMoney } from "@/lib/format";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail; onOpen?: (id: string) => void };

/** Other Transactions from the same merchant, as open rows. */
export function TransactionSimilar({ transaction, onOpen }: Props) {
	if (transaction.similar.length === 0) return null;
	return (
		<section aria-labelledby="similar-heading" className="flex flex-col gap-1 px-4">
			<h3 id="similar-heading" className="flex items-baseline gap-2 text-sm font-medium">
				Similar transactions
				<span className="text-xs font-normal text-muted-foreground">
					{transaction.similar.length}
				</span>
			</h3>
			<ul className="flex flex-col divide-y divide-border">
				{transaction.similar.map((item) => (
					<li key={item.id}>
						<button
							type="button"
							className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm row-hover"
							onClick={() => onOpen?.(item.id)}
						>
							<span className="flex min-w-0 items-center gap-2">
								{item.category ? (
									<CategoryIcon icon={item.category.icon} color={item.category.color} />
								) : null}
								<span className="truncate">{formatLongDate(item.date)}</span>
							</span>
							<Amount className={cn(item.amount > 0 && "text-positive")}>
								{formatSignedMoney(item.amount, item.isoCurrencyCode)}
							</Amount>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
