import type { CardPreset } from "../card-benefits.types";

export const flatCashBack2: CardPreset = {
	key: "flat-cash-back-2",
	issuer: "Generic",
	benefits: {
		productName: "Flat 2% cash back",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 200,
		earnRules: [],
		credits: [],
		perks: [],
		annualFee: null,
	},
};
