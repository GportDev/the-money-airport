import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import { formatRewardRate, formatRewardUnits, isCashBack, rewardUnitLabel } from "@/lib/rewards";
import type { RewardCurrency, RuleEarnings } from "@/types";

type Props = {
	rules: RuleEarnings[];
	rewardCurrency: RewardCurrency;
	currency: string;
};

/** This month's Rewards earned, split by the Earn rule that paid them. */
export function EarnBreakdown({ rules, rewardCurrency, currency }: Props) {
	const unitSuffix = isCashBack(rewardCurrency) ? "" : ` ${rewardUnitLabel(rewardCurrency)}`;
	return (
		<div className="flex flex-col gap-2">
			<h3 className="font-medium">Earn breakdown</h3>
			{rules.length === 0 ? (
				<p className="text-muted-foreground">No spend this month.</p>
			) : (
				<div className="overflow-x-auto">
					<table aria-label="Earn breakdown" className="w-full text-left">
						<thead className="text-xs text-muted-foreground">
							<tr className="border-b border-border">
								<th className="py-1.5 pr-3 font-normal">Earn rule</th>
								<th className="px-3 py-1.5 text-right font-normal">Rate</th>
								<th className="px-3 py-1.5 text-right font-normal">Spend</th>
								<th className="px-3 py-1.5 text-right font-normal">Earned</th>
								<th className="py-1.5 pl-3 text-right font-normal">Est. value</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{rules.map((rule) => (
								<tr key={`${rule.label}-${rule.ratePer100}`}>
									<th scope="row" className="py-1.5 pr-3 font-normal">
										{rule.label}
									</th>
									<td className="px-3 py-1.5 text-right">
										<Amount>{formatRewardRate(rule.ratePer100, rewardCurrency)}</Amount>
									</td>
									<td className="px-3 py-1.5 text-right">
										<Amount>{formatMoney(rule.spend, currency)}</Amount>
									</td>
									<td className="px-3 py-1.5 text-right whitespace-nowrap">
										<Amount>{formatRewardUnits(rule.units, rewardCurrency, currency)}</Amount>
										{unitSuffix}
									</td>
									<td className="py-1.5 pl-3 text-right">
										<Amount>{formatMoney(rule.value, currency)}</Amount>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
