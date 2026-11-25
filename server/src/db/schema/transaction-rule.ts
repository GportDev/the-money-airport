import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category } from "./category";

export const transactionRule = pgTable(
	"transaction_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// Matched case-insensitively against the merchant, or the name when there is none.
		merchant: text("merchant").notNull(),
		// Native cents, signed like the Transaction. Null matches any amount.
		amount: integer("amount"),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => category.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("transaction_rule_user_id_idx").on(table.userId)],
);
