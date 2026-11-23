import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import { formatRewardUnits, isCashBack, rewardUnitLabel } from "@/lib/rewards";
import type { RewardCurrency } from "@/types";

type Props = {
	earned: { units: number; value: number };
	rewardCurrency: RewardCurrency;
	currency: string;
};

/** "$12.34 cash back", or "1,234 pts ≈ $15.43" with the estimate for points and miles. */
export function RewardsEarned({ earned, rewardCurrency, currency }: Props) {
	const units = formatRewardUnits(earned.units, rewardCurrency, currency);
	const label = rewardUnitLabel(rewardCurrency);
	if (isCashBack(rewardCurrency)) {
		return (
			<span>
				<Amount>{units}</Amount>
				{` ${label}`}
			</span>
		);
	}
	return (
		<span>
			<Amount>{units}</Amount>
			{` ${label} ≈ `}
			<Amount>{formatMoney(earned.value, currency)}</Amount>
		</span>
	);
}
