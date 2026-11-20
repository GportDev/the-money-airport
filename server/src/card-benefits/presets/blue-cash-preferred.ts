import type { CardPreset } from "../card-benefits.types";

/** americanexpress.com Blue Cash Preferred. The bonus categories are U.S. only. */
export const blueCashPreferred: CardPreset = {
	key: "blue-cash-preferred",
	issuer: "American Express",
	benefits: {
		productName: "Blue Cash Preferred Card",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: [
			{
				label: "Supermarkets",
				ratePer100: 600,
				categories: ["groceries"],
				merchants: [],
				cap: { amount: 600_000, period: "year" },
			},
			{
				label: "Streaming",
				ratePer100: 600,
				categories: ["streaming"],
				merchants: [],
				cap: null,
			},
			{ label: "Transit", ratePer100: 300, categories: ["transit"], merchants: [], cap: null },
			{ label: "Gas", ratePer100: 300, categories: ["gas"], merchants: [], cap: null },
		],
		credits: [
			{
				label: "Disney streaming credit",
				amount: 1000,
				period: "month",
				categories: [],
				merchants: ["Disney", "Disney+", "DisneyPlus", "Hulu", "ESPN"],
			},
		],
		perks: [
			{
				label: "Disney credit needs enrollment",
				description: "Enroll the card in the Disney streaming credit in your Amex account.",
			},
		],
		annualFee: 9500,
	},
};
