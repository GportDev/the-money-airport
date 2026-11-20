import type { cardBenefits } from "../db/schema/card-benefits";
import type { CardBenefitsDto } from "./card-benefits.types";

export function benefitsDto(row: typeof cardBenefits.$inferSelect): CardBenefitsDto {
	return {
		presetKey: row.presetKey,
		productName: row.productName,
		// Narrowed on write: the body schema only lets a Reward currency through.
		rewardCurrency: row.rewardCurrency as CardBenefitsDto["rewardCurrency"],
		unitValue: row.unitValue,
		baseRatePer100: row.baseRatePer100,
		earnRules: row.earnRules,
		credits: row.credits,
		perks: row.perks,
		annualFee: row.annualFee,
	};
}
