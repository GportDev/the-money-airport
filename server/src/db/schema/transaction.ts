import {
	type AnyPgColumn,
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
		// Set on the extra parts of a split. The parent row keeps the first part, so the parts
		// always add up to the original amount and every total stays a plain sum.
		splitParentId: uuid("split_parent_id").references((): AnyPgColumn => transaction.id, {
			onDelete: "cascade",
		}),
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
		plaidPfcDetailed: text("plaid_pfc_detailed"),
		notes: text("notes"),
		tags: text("tags").array().notNull().default([]),
		// True once the User picks a Category; sync never overwrites it after that.
		categoryLocked: boolean("category_locked").notNull().default(false),
		// True once the User sets or clears the transfer tag by hand; pairing leaves it alone.
		tagsLocked: boolean("tags_locked").notNull().default(false),
		// True once the User renames it or picks its merchant; sync keeps the User's text.
		nameLocked: boolean("name_locked").notNull().default(false),
		merchantLocked: boolean("merchant_locked").notNull().default(false),
		// On a refund: the expense it gives Money back for.
		refundOfId: uuid("refund_of_id").references((): AnyPgColumn => transaction.id, {
			onDelete: "set null",
		}),
		isManual: boolean("is_manual").notNull().default(false),
		// A Statement import line's OFX FITID; a line already stored is skipped on re-import.
		externalId: text("external_id"),
		// True once a Statement import confirmed this row (matched or added from the file).
		statementConfirmed: boolean("statement_confirmed").notNull().default(false),
		// Statement import check on a hand-entered row: null = not checked, true = no line
		// matched it, false = the User chose Keep.
		notOnStatement: boolean("not_on_statement"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("transaction_user_date_idx").on(table.userId, table.date.desc(), table.id.desc()),
		index("transaction_user_category_idx").on(table.userId, table.categoryId),
		index("transaction_account_date_idx").on(table.bankAccountId, table.date),
		index("transaction_split_parent_idx").on(table.splitParentId),
		index("transaction_refund_of_idx").on(table.refundOfId),
		unique("transaction_user_plaid_id").on(table.userId, table.plaidTransactionId),
		unique("transaction_user_account_external_id").on(
			table.userId,
			table.bankAccountId,
			table.externalId,
		),
	],
);
