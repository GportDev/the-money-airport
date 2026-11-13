import { date, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";

/** Optional repayment facts for one loan BankAccount; the schedule is computed at read. */
export const loanTerms = pgTable(
	"loan_terms",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id")
			.notNull()
			.references(() => bankAccount.id, { onDelete: "cascade" }),
		// Native cents.
		principal: integer("principal"),
		termMonths: integer("term_months"),
		firstPaymentDate: date("first_payment_date"),
		paymentDay: integer("payment_day"),
		// Null = computed from principal, the BankAccount's APR, and the term.
		scheduledPayment: integer("scheduled_payment"),
		extraPayment: integer("extra_payment").notNull().default(0),
		// plaid | manual
		source: text("source").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex("loan_terms_bank_account_idx").on(table.bankAccountId)],
);
