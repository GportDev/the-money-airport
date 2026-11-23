import { z } from "zod";
import {
	CAP_PERIODS,
	CREDIT_PERIODS,
	REWARD_CATEGORIES,
	REWARD_CURRENCIES,
} from "./card-benefits.types";

const MAX_RATE_PER_100 = 10_000;
const MAX_CENTS = 100_000_000_000;
/** `annual_fee` is a Postgres integer column. */
const MAX_ANNUAL_FEE = 2_000_000_000;
const MAX_MERCHANTS = 20;
const CASH_BACK_UNIT_VALUE = 100;

const label = z.string().trim().min(1).max(60);
const ratePer100 = z.number().int().min(0).max(MAX_RATE_PER_100);
const positiveCents = z.number().int().min(1).max(MAX_CENTS);
const categories = z.array(z.enum(REWARD_CATEGORIES)).max(REWARD_CATEGORIES.length);
const merchants = z.array(label).max(MAX_MERCHANTS);

function hasTarget(value: { categories: string[]; merchants: string[] }) {
	return value.categories.length > 0 || value.merchants.length > 0;
}

const earnRule = z
	.object({
		label,
		ratePer100,
		categories,
		merchants,
		cap: z
			.object({ amount: positiveCents, period: z.enum(CAP_PERIODS) })
			.strict()
			.nullable(),
	})
	.strict()
	.refine(hasTarget, "An Earn rule needs a category or a merchant");

const benefitCredit = z
	.object({
		label,
		amount: positiveCents,
		period: z.enum(CREDIT_PERIODS),
		categories,
		merchants,
	})
	.strict()
	.refine(hasTarget, "A Benefit credit needs a category or a merchant");

const perk = z.object({ label, description: z.string().trim().max(200).nullable() }).strict();

const benefits = z
	.object({
		productName: z.string().trim().min(1).max(80),
		rewardCurrency: z.enum(REWARD_CURRENCIES),
		unitValue: z.number().int().min(1).max(1_000),
		baseRatePer100: ratePer100,
		earnRules: z.array(earnRule).max(20),
		credits: z.array(benefitCredit).max(20),
		perks: z.array(perk).max(30),
		annualFee: z.number().int().min(0).max(MAX_ANNUAL_FEE).nullable(),
	})
	.strict()
	.transform((value) =>
		value.rewardCurrency === "cash_back" ? { ...value, unitValue: CASH_BACK_UNIT_VALUE } : value,
	);

export const cardBenefitsBody = z.union([
	z.object({ presetKey: z.string().min(1).max(80) }).strict(),
	z.object({ benefits }).strict(),
]);

export type CardBenefitsBody = z.infer<typeof cardBenefitsBody>;

const MAX_CARDS = 200;

/** The Credit Cards page order, first card first. */
export const creditCardOrderBody = z
	.object({ accountIds: z.array(z.string().uuid()).max(MAX_CARDS) })
	.strict()
	.refine((body) => new Set(body.accountIds).size === body.accountIds.length, {
		message: "accountIds must not repeat",
	});
