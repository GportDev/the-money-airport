import type { CardBenefitsInput, EarnRule } from "./card-benefits.types";
import { type PlaidCategorized, rewardCategoryOf } from "./reward-category";

/** The Transaction fields rewards are computed from. */
export type RewardTransaction = PlaidCategorized & {
	amount: number;
	date: string;
	name: string;
	merchantName: string | null;
};

type Target = Pick<EarnRule, "categories" | "merchants">;

/** `ratePer100` is units per 100.00 of spend, and spend is in cents. */
const CENTS_PER_RATE = 10_000;
/** `unitValue` is hundredths of a cent per unit. */
const UNIT_VALUES_PER_CENT = 100;

const WORD_CHARACTER = /[a-z0-9]/;

/** Whether an Earn rule or Benefit credit pays on the Transaction. */
export function matchesTarget(target: Target, tx: RewardTransaction) {
	const merchant = (tx.merchantName ?? tx.name).toLowerCase();
	const isNamedMerchant = target.merchants.some((entry) =>
		namesMerchant(merchant, entry.toLowerCase()),
	);
	return isNamedMerchant || target.categories.includes(rewardCategoryOf(tx));
}

/** `merchant` appears in `name` as whole words, so "apple" names "Apple.com" but not "Applebee's". */
export function namesMerchant(name: string, merchant: string) {
	for (let at = name.indexOf(merchant); at !== -1; at = name.indexOf(merchant, at + 1)) {
		const before = name[at - 1] ?? "";
		const after = name[at + merchant.length] ?? "";
		if (!WORD_CHARACTER.test(before) && !WORD_CHARACTER.test(after)) return true;
	}
	return false;
}

/** The highest-rate Earn rule that matches; the first one on a tie. */
export function bestRule(rules: EarnRule[], tx: RewardTransaction) {
	let best: EarnRule | null = null;
	for (const rule of rules) {
		const isBetter = !best || rule.ratePer100 > best.ratePer100;
		if (isBetter && matchesTarget(rule, tx)) best = rule;
	}
	return best;
}

export function bestRate(benefits: CardBenefitsInput, tx: RewardTransaction) {
	return bestRule(benefits.earnRules, tx)?.ratePer100 ?? benefits.baseRatePer100;
}

export function unitsFor(spend: number, ratePer100: number) {
	return Math.max(0, Math.round((spend * ratePer100) / CENTS_PER_RATE));
}

export function estimatedValue(units: number, unitValue: number) {
	return Math.round((units * unitValue) / UNIT_VALUES_PER_CENT);
}
