import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import type { BenefitCredit, CardPerk, EarnRule } from "../../card-benefits/card-benefits.types";
import { user } from "./auth";
import { bankAccount } from "./bank-account";

/** Card benefits of one credit BankAccount; Rewards earned are computed at read. */
export const cardBenefits = pgTable(
	"card_benefits",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id")
			.notNull()
			.references(() => bankAccount.id, { onDelete: "cascade" }),
		// Null = entered through the API, not picked from a Card product preset.
		presetKey: text("preset_key"),
		productName: text("product_name").notNull(),
		// cash_back | points | miles
		rewardCurrency: text("reward_currency").notNull(),
		// Hundredths of a cent per unit: 125 = 1.25¢ a point.
		unitValue: integer("unit_value").notNull(),
		// Units per $100 of spend: 200 = 2%.
		baseRatePer100: integer("base_rate_per_100").notNull(),
		earnRules: jsonb("earn_rules").$type<EarnRule[]>().notNull().default([]),
		credits: jsonb("credits").$type<BenefitCredit[]>().notNull().default([]),
		perks: jsonb("perks").$type<CardPerk[]>().notNull().default([]),
		// Native cents.
		annualFee: integer("annual_fee"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("card_benefits_bank_account_idx").on(table.bankAccountId),
		index("card_benefits_user_idx").on(table.userId),
	],
);
