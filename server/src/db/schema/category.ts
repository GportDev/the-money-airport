import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const category = pgTable(
	"category",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		color: text("color").notNull().default("#6B7280"),
		icon: text("icon").notNull().default("circle"),
		kind: text("kind").notNull().default("expense"),
		budgetGroup: text("budget_group"),
		isDefault: boolean("is_default").notNull().default(false),
		isUncategorized: boolean("is_uncategorized").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("category_user_id_idx").on(table.userId),
		unique("category_user_name").on(table.userId, table.name),
		uniqueIndex("category_one_uncategorized")
			.on(table.userId)
			.where(sql`${table.isUncategorized} = true`),
	],
);
