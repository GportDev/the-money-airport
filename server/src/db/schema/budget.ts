import { date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category } from "./category";

export const budget = pgTable(
	"budget",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => category.id, { onDelete: "cascade" }),
		// First day of the month, e.g. 2026-08-01.
		month: date("month").notNull(),
		// Planned Money in Base currency cents.
		amount: integer("amount").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [unique("budget_user_category_month").on(table.userId, table.categoryId, table.month)],
);
