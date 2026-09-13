import { date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";

export const accountBalanceSnapshot = pgTable(
	"account_balance_snapshot",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id")
			.notNull()
			.references(() => bankAccount.id, { onDelete: "cascade" }),
		date: date("date").notNull(),
		balance: integer("balance").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("account_balance_snapshot_account_date").on(table.bankAccountId, table.date),
		index("account_balance_snapshot_user_date_idx").on(table.userId, table.date),
		index("account_balance_snapshot_account_date_idx").on(table.bankAccountId, table.date),
	],
);
