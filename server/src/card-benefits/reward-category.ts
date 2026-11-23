import type { RewardCategory } from "./card-benefits.types";

export type PlaidCategorized = { plaidPfcDetailed: string | null; plaidPfcPrimary: string | null };

const BY_DETAILED: Record<string, RewardCategory> = {
	FOOD_AND_DRINK_GROCERIES: "groceries",
	FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: "other",
	TRANSPORTATION_GAS: "gas",
	ENTERTAINMENT_TV_AND_MOVIES: "streaming",
	ENTERTAINMENT_MUSIC_AND_AUDIO: "streaming",
	MEDICAL_PHARMACIES_AND_SUPPLEMENTS: "drugstores",
	GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: "online_shopping",
};

const BY_PREFIX: [string, RewardCategory][] = [
	["FOOD_AND_DRINK", "dining"],
	["TRANSPORTATION", "transit"],
	["TRAVEL", "travel"],
	["ENTERTAINMENT", "entertainment"],
];

/** The Reward category of a Transaction, from its most specific Plaid category. */
export function rewardCategoryOf(tx: PlaidCategorized): RewardCategory {
	const plaidCategory = tx.plaidPfcDetailed || tx.plaidPfcPrimary;
	if (!plaidCategory) return "other";
	const byPrefix = BY_PREFIX.find(([prefix]) => plaidCategory.startsWith(prefix))?.[1];
	return BY_DETAILED[plaidCategory] ?? byPrefix ?? "other";
}
