import type { CardPreset } from "../card-benefits.types";

export const flatCashBack15: CardPreset = {
	key: "flat-cash-back-1-5",
	issuer: "Generic",
	benefits: {
		productName: "Flat 1.5% cash back",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 150,
		earnRules: [],
		credits: [],
		perks: [],
		annualFee: null,
	},
};
