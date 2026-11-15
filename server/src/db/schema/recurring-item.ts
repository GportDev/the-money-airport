import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";
import { category } from "./category";

export const recurringItem = pgTable(
	"recurring_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
		merchantName: text("merchant_name").notNull(),
		merchantLogoUrl: text("merchant_logo_url"),
		// Absolute cents in the BankAccount's currency (Base when there is none), treated as outflow.
		amount: integer("amount").notNull(),
		// weekly | monthly | yearly
		cadence: text("cadence").notNull(),
		nextDate: date("next_date").notNull(),
		isManual: boolean("is_manual").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),
		lastPaidOn: date("last_paid_on"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("recurring_item_user_next_date_idx").on(table.userId, table.nextDate),
		index("recurring_item_user_active_idx").on(table.userId, table.isActive),
	],
);
