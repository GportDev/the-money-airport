import {
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";

/** One closed billing period of a credit BankAccount. */
export const cardStatement = pgTable(
	"card_statement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id")
			.notNull()
			.references(() => bankAccount.id, { onDelete: "cascade" }),
		periodStart: date("period_start").notNull(),
		// The close date.
		periodEnd: date("period_end").notNull(),
		// Native cents.
		statementBalance: integer("statement_balance").notNull(),
		minimumPayment: integer("minimum_payment"),
		dueDate: date("due_date"),
		// plaid | manual
		source: text("source").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("card_statement_account_period_end_idx").on(table.bankAccountId, table.periodEnd),
		index("card_statement_user_idx").on(table.userId),
	],
);
