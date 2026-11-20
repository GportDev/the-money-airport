import { BenefitCredits } from "@/components/credit-cards/benefit-credits";
import { CardPerks } from "@/components/credit-cards/card-perks";
import { EarnBreakdown } from "@/components/credit-cards/earn-breakdown";
import { RewardsTotals } from "@/components/credit-cards/rewards-totals";
import { Amount } from "@/components/ui/amount";
import { formatOptionalMoney } from "@/lib/format";
import type { CardBenefits, RewardsTracking } from "@/types";

type Props = {
	benefits: CardBenefits;
	rewards: RewardsTracking;
	currency: string;
};

/** Rewards earned, Benefit credits, perks, and the annual fee of a card's Card product. */
export function CardBenefitsDetails({ benefits, rewards, currency }: Props) {
	return (
		<>
			<RewardsTotals
				rewards={rewards}
				rewardCurrency={benefits.rewardCurrency}
				currency={currency}
			/>
			<EarnBreakdown
				rules={rewards.month.byRule}
				rewardCurrency={benefits.rewardCurrency}
				currency={currency}
			/>
			{rewards.credits.length > 0 ? (
				<BenefitCredits credits={rewards.credits} currency={currency} />
			) : null}
			{benefits.perks.length > 0 ? <CardPerks perks={benefits.perks} /> : null}
			<p className="flex justify-between border-t border-border pt-3">
				<span className="text-muted-foreground">Annual fee</span>
				<Amount>{formatOptionalMoney(benefits.annualFee, currency)}</Amount>
			</p>
		</>
	);
}
