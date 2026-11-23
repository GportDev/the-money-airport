import { RewardsEarned } from "@/components/credit-cards/rewards-earned";
import { Amount } from "@/components/ui/amount";
import { shortDate } from "@/lib/forecast";
import type { CreditCard } from "@/types";

const APR_DECIMALS = 2;

function billingPeriodLabel({ periodStart, closesOn, dueOn }: CreditCard["billingPeriod"]) {
	if (!closesOn) return `Since ${shortDate(periodStart)}`;
	const range = `${shortDate(periodStart)} – ${shortDate(closesOn)}`;
	return dueOn ? `${range} · due ${shortDate(dueOn)}` : range;
}

/** APR, the open billing period, and Rewards earned this month. */
export function CardTileFacts({ card }: { card: CreditCard }) {
	return (
		<dl className="flex flex-col gap-1.5 border-t border-border pt-3">
			<div className="flex justify-between gap-3">
				<dt className="shrink-0 text-muted-foreground">APR</dt>
				<dd>
					{card.aprBps === null ? (
						<span className="text-muted-foreground">Add APR</span>
					) : (
						<Amount>{`${(card.aprBps / 100).toFixed(APR_DECIMALS)}%`}</Amount>
					)}
				</dd>
			</div>
			<div className="flex justify-between gap-3">
				<dt className="shrink-0 text-muted-foreground">Billing period</dt>
				<dd className="text-right">{billingPeriodLabel(card.billingPeriod)}</dd>
			</div>
			<div className="flex justify-between gap-3">
				<dt className="shrink-0 text-muted-foreground">Rewards this month</dt>
				<dd className="text-right">
					{card.benefits && card.rewards ? (
						<RewardsEarned
							earned={card.rewards.month}
							rewardCurrency={card.benefits.rewardCurrency}
							currency={card.isoCurrencyCode}
						/>
					) : (
						"—"
					)}
				</dd>
			</div>
		</dl>
	);
}
