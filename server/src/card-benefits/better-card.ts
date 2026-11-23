import { TRANSFER_TAGS } from "../transactions/transactions.types";
import type { BetterCard, CardBenefitsInput } from "./card-benefits.types";
import { bestRate, estimatedValue, type RewardTransaction, unitsFor } from "./earn-rules";

export type RewardCard = {
	accountId: string;
	name: string;
	mask: string | null;
	isHidden: boolean;
	isoCurrencyCode: string;
	benefits: CardBenefitsInput | null;
};

export type CardPurchase = RewardTransaction & {
	bankAccountId: string | null;
	isoCurrencyCode: string;
	tags: string[];
};

/**
 * The other card that would have earned the most on a purchase, when it beats the paying card.
 * `cards` are the User's credit BankAccounts in name order, which settles ties.
 */
export function betterCard(cards: RewardCard[], tx: CardPurchase): BetterCard | null {
	const paying = cards.find((card) => card.accountId === tx.bankAccountId);
	if (!paying || tx.amount >= 0 || isTransfer(tx)) return null;
	const earned = purchaseValue(paying.benefits, tx);
	let best: BetterCard | null = null;
	for (const card of cards) {
		if (card === paying || !isCandidate(card, tx)) continue;
		const extraValue = purchaseValue(card.benefits, tx) - earned;
		if (extraValue > (best?.extraValue ?? 0)) {
			best = { accountId: card.accountId, name: card.name, mask: card.mask, extraValue };
		}
	}
	return best;
}

function isTransfer(tx: CardPurchase) {
	return tx.tags.some((tag) => (TRANSFER_TAGS as readonly string[]).includes(tag));
}

function isCandidate(card: RewardCard, tx: CardPurchase) {
	return !card.isHidden && card.benefits !== null && card.isoCurrencyCode === tx.isoCurrencyCode;
}

/** Estimated native cents the card earns on the purchase; caps are ignored. */
function purchaseValue(benefits: CardBenefitsInput | null, tx: CardPurchase) {
	if (!benefits) return 0;
	return estimatedValue(unitsFor(-tx.amount, bestRate(benefits, tx)), benefits.unitValue);
}
