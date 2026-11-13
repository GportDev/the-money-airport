import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { plaidItem } from "./plaid-item";

export const bankAccount = pgTable(
	"bank_account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		plaidItemId: uuid("plaid_item_id").references(() => plaidItem.id),
		plaidAccountId: text("plaid_account_id"),
		source: text("source").notNull().default("plaid"),
		name: text("name").notNull(),
		officialName: text("official_name"),
		displayGroup: text("display_group").notNull(),
		type: text("type").notNull(),
		subtype: text("subtype"),
		mask: text("mask"),
		currentBalance: integer("current_balance").notNull().default(0),
		availableBalance: integer("available_balance"),
		creditLimit: integer("credit_limit"),
		isoCurrencyCode: text("iso_currency_code").notNull().default("USD"),
		isAsset: boolean("is_asset").notNull().default(true),
		isHidden: boolean("is_hidden").notNull().default(false),
		// User-entered yearly rate in basis points (Plaid does not provide it).
		apyBps: integer("apy_bps"),
		// Operating cash. Null = the default for the type (checking only); see isInCashPlan.
		inCashPlan: boolean("in_cash_plan"),
		// Liabilities only: whether Payback pays this one down, and its place under `custom`.
		inDebtPlan: boolean("in_debt_plan").notNull().default(true),
		debtPriority: integer("debt_priority"),
		// Card terms (credit) and loan rate (loan). APR in basis points: 2900 = 29.00%.
		aprBps: integer("apr_bps"),
		statementCloseDay: integer("statement_close_day"),
		paymentDueDay: integer("payment_due_day"),
		// statement_balance | new_charges | minimum | fixed
		paymentRule: text("payment_rule").notNull().default("statement_balance"),
		fixedPayment: integer("fixed_payment"),
		// Card-term fields the User set by hand; Plaid Liabilities sync leaves them alone.
		overriddenFields: text("overridden_fields").array().notNull().default([]),
		lastSyncedAt: timestamp("last_synced_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("bank_account_user_id_idx").on(table.userId),
		index("bank_account_plaid_item_id_idx").on(table.plaidItemId),
		index("bank_account_user_group_idx").on(table.userId, table.displayGroup),
		unique("bank_account_user_plaid_account").on(table.userId, table.plaidAccountId),
	],
);
