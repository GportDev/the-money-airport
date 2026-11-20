import { BetterCardBadge } from "@/components/transactions/better-card-badge";
import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/forecast";
import { formatSignedMoney } from "@/lib/format";
import type { TransactionListItem } from "@/types";

/** One card Transaction in a billing period, with the Better card when there is one. */
export function BillingPeriodRow({ item }: { item: TransactionListItem }) {
	const title = item.merchantName ?? item.name;
	const currency = item.isoCurrencyCode;
	return (
		<li className="flex items-center gap-3 px-3 py-2">
			<MerchantLogo name={title} url={item.merchantLogoUrl} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate">{title}</span>
				<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
					<span>{shortDate(item.date)}</span>
					{item.category ? <span>{item.category.name}</span> : null}
					{item.betterCard ? (
						<>
							<BetterCardBadge betterCard={item.betterCard} currency={currency} />
							{/* The badge already reads the gain to assistive tech. */}
							<Amount aria-hidden className="text-positive">
								{formatSignedMoney(item.betterCard.extraValue, currency)}
							</Amount>
						</>
					) : null}
				</span>
			</div>
			<Amount className={cn("shrink-0 text-right", item.amount > 0 && "text-positive")}>
				{formatSignedMoney(item.amount, currency)}
			</Amount>
		</li>
	);
}
