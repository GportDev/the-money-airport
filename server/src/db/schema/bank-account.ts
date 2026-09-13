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
