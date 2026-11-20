import { creditStatus } from "./benefit-credits";
import { periodBounds } from "./calendar-periods";
import type { CardBenefitsInput, RewardsTracking } from "./card-benefits.types";
import type { RewardTransaction } from "./earn-rules";
import { rewardsEarned } from "./rewards-earned";

/** `yearTransactions`: the card's non-Transfer Transactions from January 1 through `today`, in date order. */
export function rewardsTracking(
	benefits: CardBenefitsInput,
	yearTransactions: RewardTransaction[],
	today: string,
): RewardsTracking {
	const monthStart = periodBounds(today, "month").start;
	const yearStart = periodBounds(today, "year").start;
	return {
		month: rewardsEarned(benefits, yearTransactions, monthStart, today),
		year: rewardsEarned(benefits, yearTransactions, yearStart, today),
		credits: benefits.credits.map((credit) => creditStatus(credit, yearTransactions, today)),
	};
}
