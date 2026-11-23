import { RewardsEarned } from "@/components/credit-cards/rewards-earned";
import { formatMoney } from "@/lib/format";
import type { RewardCurrency, RewardsTracking } from "@/types";

type Props = {
	rewards: RewardsTracking;
	rewardCurrency: RewardCurrency;
	currency: string;
};

/** Rewards earned this calendar month and since January 1. */
export function RewardsTotals({ rewards, rewardCurrency, currency }: Props) {
	const totals = [
		{ label: "This month", period: rewards.month },
		{ label: "Year to date", period: rewards.year },
	];
	return (
		<dl className="grid gap-3 sm:grid-cols-2">
			{totals.map(({ label, period }) => (
				<div key={label} className="rounded-lg border border-border p-3">
					<dt className="text-xs text-muted-foreground">{label}</dt>
					<dd className="font-medium">
						<RewardsEarned earned={period} rewardCurrency={rewardCurrency} currency={currency} />
					</dd>
					<dd className="text-xs text-muted-foreground">
						{`on ${formatMoney(period.spend, currency)} spend`}
					</dd>
				</div>
			))}
		</dl>
	);
}
