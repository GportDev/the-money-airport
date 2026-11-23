import type { CardPreset } from "../card-benefits.types";

/**
 * creditcards.chase.com Prime Visa, with a Prime membership. Rewards are points at 100 per $1, so
 * they are tracked as cash back.
 */
export const primeVisa: CardPreset = {
	key: "prime-visa",
	issuer: "Chase",
	benefits: {
		productName: "Prime Visa",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: [
			{
				label: "Amazon, Whole Foods, Chase Travel",
				ratePer100: 500,
				categories: [],
				merchants: ["Amazon", "Amazon.com", "Audible", "Whole Foods", "Chase Travel"],
				cap: null,
			},
			{
				label: "Gas, restaurants, transit",
				ratePer100: 200,
				categories: ["gas", "dining", "transit"],
				merchants: [],
				cap: null,
			},
		],
		credits: [],
		perks: [
			{ label: "No foreign transaction fees", description: null },
			{ label: "Travel and purchase protection", description: null },
		],
		annualFee: 0,
	},
};
