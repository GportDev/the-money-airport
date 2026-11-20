import type { CardPreset } from "../card-benefits.types";

/**
 * apple.com/apple-card. Rates assume Apple Pay (2%); the titanium card earns 1%. Booking.com is
 * left out: its 3% needs Apple Card's own booking link.
 */
export const appleCard: CardPreset = {
	key: "apple-card",
	issuer: "Apple",
	benefits: {
		productName: "Apple Card",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 200,
		earnRules: [
			{
				label: "Apple",
				ratePer100: 300,
				categories: [],
				merchants: ["Apple", "Apple.com", "App Store", "iTunes"],
				cap: null,
			},
			{
				label: "3% partners",
				ratePer100: 300,
				categories: [],
				merchants: [
					"Ace Hardware",
					"ChargePoint",
					"Duane Reade",
					"Exxon",
					"Mobil",
					"ExxonMobil",
					"Hertz",
					"Nike",
					"Uber",
					"Uber Eats",
					"UberEats",
					"Walgreens",
				],
				cap: null,
			},
		],
		credits: [],
		perks: [
			{ label: "Daily Cash", description: "Paid daily as cash; never expires." },
			{
				label: "No fees",
				description: "No annual, foreign transaction, late, or over-limit fees.",
			},
			{ label: "Apple Card Monthly Installments", description: "3% on Apple products, 0% APR." },
		],
		annualFee: 0,
	},
};
