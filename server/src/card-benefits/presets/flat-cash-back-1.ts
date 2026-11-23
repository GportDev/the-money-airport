import type { CardPreset } from "../card-benefits.types";

export const flatCashBack1: CardPreset = {
	key: "flat-cash-back-1",
	issuer: "Generic",
	benefits: {
		productName: "Flat 1% cash back",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: [],
		credits: [],
		perks: [],
		annualFee: null,
	},
};
