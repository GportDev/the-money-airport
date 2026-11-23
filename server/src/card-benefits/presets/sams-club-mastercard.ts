import type { CardPreset, EarnRule } from "../card-benefits.types";

const SAMS_CLUB = ["Sam's Club", "Sams Club", "SamsClub"];

/** Sam's Cash only spends at Sam's Club; it is valued here at face. */
const SHARED_RULES: EarnRule[] = [
	{
		label: "Gas",
		ratePer100: 500,
		categories: ["gas"],
		merchants: [],
		cap: { amount: 600_000, period: "year" },
	},
	{
		label: "Dining and takeout",
		ratePer100: 300,
		categories: ["dining"],
		merchants: [],
		cap: null,
	},
];

const SHARED_PERKS = [
	{ label: "Doubles as membership card", description: null },
	{ label: "No foreign transaction fees", description: null },
];

/** synchrony.com/partner/sams-club, for a Plus member: 3% at Sam's Club. */
export const samsClubMastercardPlus: CardPreset = {
	key: "sams-club-mastercard-plus",
	issuer: "Synchrony",
	benefits: {
		productName: "Sam's Club Mastercard (Plus member)",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: [
			...SHARED_RULES,
			{ label: "Sam's Club", ratePer100: 300, categories: [], merchants: SAMS_CLUB, cap: null },
		],
		credits: [],
		perks: SHARED_PERKS,
		annualFee: 0,
	},
};

/** synchrony.com/partner/sams-club, for a Club member: Sam's Club earns the base 1%. */
export const samsClubMastercard: CardPreset = {
	key: "sams-club-mastercard",
	issuer: "Synchrony",
	benefits: {
		productName: "Sam's Club Mastercard (Club member)",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: SHARED_RULES,
		credits: [],
		perks: SHARED_PERKS,
		annualFee: 0,
	},
};
