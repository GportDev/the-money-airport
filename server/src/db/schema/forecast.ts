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
import { category } from "./category";
import { goal } from "./goal";
import { transaction } from "./transaction";

export const forecastSection = pgTable(
	"forecast_section",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		// revenue | savings | fixed_expense | variable_expense
		type: text("type").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex("forecast_section_user_name_idx").on(table.userId, table.name)],
);

export const forecastRow = pgTable(
	"forecast_row",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sectionId: uuid("section_id")
			.notNull()
			.references(() => forecastSection.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
		dayOfMonth: integer("day_of_month"),
		// Pay-from / receive-into. Null = Operating cash; a credit BankAccount puts spend on the card.
		bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, {
			onDelete: "set null",
		}),
		// Savings rows only: the Fund the deposits grow.
		goalId: uuid("goal_id").references(() => goal.id, { onDelete: "set null" }),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("forecast_row_section_idx").on(table.sectionId),
		index("forecast_row_user_idx").on(table.userId),
	],
);

export const forecastCell = pgTable(
	"forecast_cell",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		forecastRowId: uuid("forecast_row_id")
			.notNull()
			.references(() => forecastRow.id, { onDelete: "cascade" }),
		year: integer("year").notNull(),
		month: integer("month").notNull(),
		// Plan amount in Base cents, unsigned; the section type gives the direction.
		amount: integer("amount").notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("forecast_cell_row_year_month_idx").on(
			table.forecastRowId,
			table.year,
			table.month,
		),
	],
);

export const forecastOneOff = pgTable(
	"forecast_one_off",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sectionId: uuid("section_id")
			.notNull()
			.references(() => forecastSection.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		date: date("date").notNull(),
		// Base cents, signed: + inflow, − outflow.
		amount: integer("amount").notNull(),
		bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
		goalId: uuid("goal_id").references(() => goal.id, { onDelete: "set null" }),
		// expected | done | cancelled
		status: text("status").notNull().default("expected"),
		matchedTransactionId: uuid("matched_transaction_id").references(() => transaction.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("forecast_one_off_user_date_idx").on(table.userId, table.date),
		index("forecast_one_off_user_status_idx").on(table.userId, table.status),
	],
);
