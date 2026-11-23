import { periodBounds } from "./calendar-periods";
import type { BenefitCredit, BenefitCreditStatus } from "./card-benefits.types";
import { matchesTarget, type RewardTransaction } from "./earn-rules";

/** How much of a Benefit credit the card's matching purchases used in the period containing `today`. */
export function creditStatus(
	credit: BenefitCredit,
	transactions: RewardTransaction[],
	today: string,
): BenefitCreditStatus {
	const { start, end } = periodBounds(today, credit.period);
	const spend = transactions
		.filter((tx) => tx.date >= start && tx.date <= end && matchesTarget(credit, tx))
		.reduce((sum, tx) => sum - tx.amount, 0);
	const used = Math.min(credit.amount, Math.max(0, spend));
	return { ...credit, periodStart: start, periodEnd: end, used, remaining: credit.amount - used };
}
