import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";
import { category } from "./category";

export const transaction = pgTable(
	"transaction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => category.id),
		plaidTransactionId: text("plaid_transaction_id"),
		pendingTransactionId: text("pending_transaction_id"),
		name: text("name").notNull(),
		merchantName: text("merchant_name"),
		merchantLogoUrl: text("merchant_logo_url"),
		// Native cents. Positive = income, negative = expense.
		amount: integer("amount").notNull(),
		isoCurrencyCode: text("iso_currency_code").notNull(),
		date: date("date").notNull(),
		pending: boolean("pending").notNull().default(false),
		plaidCategory: text("plaid_category").array(),
		plaidPfcPrimary: text("plaid_pfc_primary"),
		notes: text("notes"),
		tags: text("tags").array().notNull().default([]),
		// True once the User picks a Category; sync never overwrites it after that.
		categoryLocked: boolean("category_locked").notNull().default(false),
		// True once the User sets or clears the transfer tag by hand; pairing leaves it alone.
		tagsLocked: boolean("tags_locked").notNull().default(false),
		isManual: boolean("is_manual").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("transaction_user_date_idx").on(table.userId, table.date.desc(), table.id.desc()),
		index("transaction_user_category_idx").on(table.userId, table.categoryId),
		index("transaction_account_date_idx").on(table.bankAccountId, table.date),
		unique("transaction_user_plaid_id").on(table.userId, table.plaidTransactionId),
	],
);
