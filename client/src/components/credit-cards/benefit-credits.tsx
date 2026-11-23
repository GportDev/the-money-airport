import { Amount } from "@/components/ui/amount";
import { Progress } from "@/components/ui/progress";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import type { BenefitCreditStatus } from "@/types";

const FULLY_USED = 100;

function usedPercent(credit: BenefitCreditStatus) {
	if (credit.amount <= 0) return 0;
	return Math.min(FULLY_USED, Math.max(0, (credit.used / credit.amount) * FULLY_USED));
}

/** Each Benefit credit with how much of the current period's amount is used. */
export function BenefitCredits({
	credits,
	currency,
}: {
	credits: BenefitCreditStatus[];
	currency: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="font-medium">Benefit credits</h3>
			<ul className="flex flex-col gap-3">
				{credits.map((credit) => (
					<li key={`${credit.label}-${credit.period}`} className="flex flex-col gap-1">
						<p className="flex flex-wrap justify-between gap-x-3">
							<span>{credit.label}</span>
							<span>
								<Amount>{formatMoney(credit.used, currency)}</Amount>
								{" of "}
								<Amount>{formatMoney(credit.amount, currency)}</Amount>
								{" used"}
							</span>
						</p>
						<Progress value={usedPercent(credit)} aria-label={`${credit.label} used`} />
						<p className="text-xs text-muted-foreground">
							{`Resets after ${shortDate(credit.periodEnd)}`}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}
