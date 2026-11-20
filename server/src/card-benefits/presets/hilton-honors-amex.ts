import type { CardPreset } from "../card-benefits.types";

/**
 * americanexpress.com Hilton Honors Card. Hilton points are valued at 0.5¢, an estimate; the page
 * gives no value. The bonus categories are U.S. only.
 */
export const hiltonHonorsAmex: CardPreset = {
	key: "hilton-honors-amex",
	issuer: "American Express",
	benefits: {
		productName: "Hilton Honors American Express Card",
		rewardCurrency: "points",
		unitValue: 50,
		baseRatePer100: 300,
		earnRules: [
			{
				label: "Hilton hotels and resorts",
				ratePer100: 700,
				categories: [],
				merchants: [
					"Hilton",
					"DoubleTree",
					"Hampton Inn",
					"Embassy Suites",
					"Homewood Suites",
					"Home2 Suites",
					"Conrad",
					"Waldorf Astoria",
					"Curio Collection",
					"Tapestry Collection",
					"Canopy by Hilton",
					"Tru by Hilton",
					"Signia",
					"LXR",
					"Motto by Hilton",
					"Spark by Hilton",
					"Tempo by Hilton",
				],
				cap: null,
			},
			{
				label: "Restaurants, supermarkets, gas",
				ratePer100: 500,
				categories: ["dining", "groceries", "gas"],
				merchants: [],
				cap: null,
			},
		],
		credits: [],
		perks: [
			{ label: "Hilton Honors Silver status", description: "20% bonus on Base Points." },
			{ label: "No foreign transaction fees", description: null },
		],
		annualFee: 0,
	},
};
