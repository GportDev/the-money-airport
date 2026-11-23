import type { CardPreset } from "../card-benefits.types";

/**
 * americanexpress.com Delta SkyMiles Reserve. Miles are valued at 1.2¢, an estimate; the page
 * gives no value. Resy charges post under each restaurant's own name, so the Resy credit only
 * tracks charges that name Resy.
 */
export const deltaSkymilesReserve: CardPreset = {
	key: "delta-skymiles-reserve",
	issuer: "American Express",
	benefits: {
		productName: "Delta SkyMiles Reserve American Express Card",
		rewardCurrency: "miles",
		unitValue: 120,
		baseRatePer100: 100,
		earnRules: [
			{
				label: "Delta purchases",
				ratePer100: 300,
				categories: [],
				merchants: ["Delta Air", "Delta Air Lines", "Delta.com"],
				cap: null,
			},
		],
		credits: [
			{ label: "Resy credit", amount: 2000, period: "month", categories: [], merchants: ["Resy"] },
			{
				label: "Rideshare credit",
				amount: 1000,
				period: "month",
				categories: [],
				merchants: ["Uber", "Lyft"],
			},
			{
				label: "Delta Stays credit",
				amount: 20_000,
				period: "year",
				categories: [],
				merchants: ["Delta Stays"],
			},
		],
		perks: [
			{
				label: "Companion Certificate",
				description: "One round-trip Delta companion fare each year after renewal.",
			},
			{
				label: "Delta Sky Club",
				description: "15 visits a Medallion Year; unlimited after $75,000 spend.",
			},
			{
				label: "Centurion Lounge access",
				description: "Same-day Delta flight booked with the card.",
			},
			{
				label: "MQD Headstart and Boost",
				description: "$2,500 MQDs a year, plus $1 per $10 spent.",
			},
			{ label: "First and second checked bag free", description: null },
			{ label: "Global Entry or TSA PreCheck fee credit", description: null },
			{ label: "No foreign transaction fees", description: null },
			{
				label: "Credits need enrollment",
				description: "Enroll Resy and rideshare credits in Amex.",
			},
		],
		annualFee: 65_000,
	},
};
