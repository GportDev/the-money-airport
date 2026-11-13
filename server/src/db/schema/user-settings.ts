import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userSettings = pgTable("user_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	currency: text("currency").notNull().default("USD"),
	dashboardWidgets: jsonb("dashboard_widgets"),
	budgetCopyForward: boolean("budget_copy_forward").notNull().default(false),
	// Base cents; the lowest Operating cash the plan allows on any day.
	safetyBuffer: integer("safety_buffer").notNull().default(15000),
	// 1-31; null = last day of the month.
	paybackDay: integer("payback_day"),
	// avalanche | snowball | custom
	debtStrategy: text("debt_strategy").notNull().default("avalanche"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
