import type { CardStatementDto } from "../liabilities/liabilities.types";

export const REWARD_CURRENCIES = ["cash_back", "points", "miles"] as const;
export type RewardCurrency = (typeof REWARD_CURRENCIES)[number];

/** Merchant types issuers pay bonus rates on; mapped from the Plaid category at read. */
export const REWARD_CATEGORIES = [
	"dining",
	"groceries",
	"gas",
	"travel",
	"transit",
	"streaming",
	"entertainment",
	"drugstores",
	"online_shopping",
	"other",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];

export const CAP_PERIODS = ["month", "quarter", "year"] as const;
export type CapPeriod = (typeof CAP_PERIODS)[number];

export const CREDIT_PERIODS = ["month", "quarter", "half_year", "year"] as const;
export type CreditPeriod = (typeof CREDIT_PERIODS)[number];

export type EarnRule = {
	label: string;
	/** Units per $100 of spend: 200 = 2% cash back, 300 = 3 points per dollar. */
	ratePer100: number;
	categories: RewardCategory[];
	/** Case-insensitive whole words or phrases in the merchant or Transaction name. */
	merchants: string[];
	/** Spend (native cents) per calendar period that earns this rate; the rest earns the base rate. */
	cap: { amount: number; period: CapPeriod } | null;
};

export type BenefitCredit = {
	label: string;
	/** Native cents per calendar period. */
	amount: number;
	period: CreditPeriod;
	categories: RewardCategory[];
	merchants: string[];
};

export type CardPerk = { label: string; description: string | null };

/** Card benefits as stored on a credit BankAccount. */
export type CardBenefitsInput = {
	productName: string;
	rewardCurrency: RewardCurrency;
	/** Hundredths of a cent per unit: 125 = 1.25¢ a point. Cash back is always 100. */
	unitValue: number;
	baseRatePer100: number;
	earnRules: EarnRule[];
	credits: BenefitCredit[];
	perks: CardPerk[];
	/** Native cents. */
	annualFee: number | null;
};

export type CardBenefitsDto = CardBenefitsInput & {
	/** The Card product preset these came from; null when entered through the API. */
	presetKey: string | null;
};

export type CardPresetSummary = { key: string; issuer: string; productName: string };

/** A Card product kept in the repo, derived from the issuer's benefits page. */
export type CardPreset = { key: string; issuer: string; benefits: CardBenefitsInput };

export type RuleEarnings = {
	/** The Earn rule label, or "Everything else" for the base rate. */
	label: string;
	ratePer100: number;
	spend: number;
	units: number;
	value: number;
};

export type RewardsPeriod = {
	from: string;
	to: string;
	/** Native cents of purchases net of refunds, Transfers left out. */
	spend: number;
	/** Cents for cash back, else points or miles. */
	units: number;
	/** Estimated native cents. */
	value: number;
	byRule: RuleEarnings[];
};

export type BenefitCreditStatus = BenefitCredit & {
	periodStart: string;
	periodEnd: string;
	used: number;
	remaining: number;
};

export type RewardsTracking = {
	/** The current calendar month. */
	month: RewardsPeriod;
	/** January 1 through today. */
	year: RewardsPeriod;
	credits: BenefitCreditStatus[];
};

export type CreditCardDto = {
	id: string;
	name: string;
	officialName: string | null;
	mask: string | null;
	institutionName: string | null;
	institutionLogo: string | null;
	isoCurrencyCode: string;
	currentBalance: number;
	/** Plaid's available balance, else limit − balance; null without a limit. */
	availableCredit: number | null;
	creditLimit: number | null;
	utilization: number | null;
	aprBps: number | null;
	billingPeriod: {
		/** First day of the open period. */
		periodStart: string;
		/** Next statement close date; null when the close day is unknown. */
		closesOn: string | null;
		/** Next payment due date; null when unknown. */
		dueOn: string | null;
		/** Native cents charged in the open period. */
		spend: number;
		latestStatement: CardStatementDto | null;
	};
	benefits: CardBenefitsDto | null;
	/** null until the card has benefits. */
	rewards: RewardsTracking | null;
};

/** The User's other card that would have earned more on a Transaction. */
export type BetterCard = {
	accountId: string;
	name: string;
	mask: string | null;
	/** Estimated extra value in the Transaction's native cents; always > 0. */
	extraValue: number;
};
