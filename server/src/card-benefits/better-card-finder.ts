import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { benefitsDto } from "./benefits-dto";
import { betterCard, type CardPurchase, type RewardCard } from "./better-card";
import { type CreditAccountRow, creditAccounts } from "./credit-accounts";

export type BetterCardFinder = Awaited<ReturnType<typeof betterCardFinder>>;

/**
 * Loads the User's cards once and answers the Better card for each of their Transactions.
 * CONVENTION-DEVIATION: a plain query function, like `liabilityDetails`, so TransactionsService
 * can use it without TransactionsModule and CardBenefitsModule importing each other.
 */
export async function betterCardFinder(db: PostgresJsDatabase, userId: string) {
	const cards = (await creditAccounts(db, userId)).map(rewardCard);
	return (tx: CardPurchase) => betterCard(cards, tx);
}

function rewardCard(row: CreditAccountRow): RewardCard {
	return {
		accountId: row.account.id,
		name: row.account.name,
		mask: row.account.mask,
		isHidden: row.account.isHidden,
		isoCurrencyCode: row.account.isoCurrencyCode,
		benefits: row.benefits && benefitsDto(row.benefits),
	};
}
