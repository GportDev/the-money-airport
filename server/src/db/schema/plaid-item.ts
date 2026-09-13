import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const plaidItem = pgTable(
	"plaid_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		plaidItemId: text("plaid_item_id").notNull(),
		accessToken: text("access_token").notNull(),
		institutionId: text("institution_id"),
		institutionName: text("institution_name"),
		institutionLogo: text("institution_logo"),
		cursor: text("cursor"),
		status: text("status").notNull().default("active"),
		errorCode: text("error_code"),
		lastSyncedAt: timestamp("last_synced_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("plaid_item_user_id_idx").on(table.userId),
		unique("plaid_item_user_plaid_id").on(table.userId, table.plaidItemId),
	],
);
