import {
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";
import { transaction } from "./transaction";

export const goal = pgTable(
	"goal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		// save_up | pay_down
		type: text("type").notNull(),
		// accounts | fund; fund only with save_up
		funding: text("funding").notNull().default("accounts"),
		// The asset BankAccount a Fund lives in. A Fund cannot outlive its host.
		hostBankAccountId: uuid("host_bank_account_id").references(() => bankAccount.id, {
			onDelete: "cascade",
		}),
		icon: text("icon").notNull().default("piggy-bank"),
		color: text("color").notNull().default("#10B981"),
		thumbnailUrl: text("thumbnail_url"),
		// Base currency cents.
		targetAmount: integer("target_amount").notNull(),
		targetDate: date("target_date"),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("goal_user_id_idx").on(table.userId),
		index("goal_host_bank_account_idx").on(table.hostBankAccountId),
	],
);

export const goalAccount = pgTable(
	"goal_account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		goalId: uuid("goal_id")
			.notNull()
			.references(() => goal.id, { onDelete: "cascade" }),
		bankAccountId: uuid("bank_account_id")
			.notNull()
			.references(() => bankAccount.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("goal_account_bank_account").on(table.bankAccountId),
		index("goal_account_goal_idx").on(table.goalId),
	],
);

export const goalFundEntry = pgTable(
	"goal_fund_entry",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		goalId: uuid("goal_id")
			.notNull()
			.references(() => goal.id, { onDelete: "cascade" }),
		date: date("date").notNull(),
		// Native host cents, signed: + deposit / interest, − withdrawal.
		amount: integer("amount").notNull(),
		// deposit | withdrawal | interest
		kind: text("kind").notNull(),
		// The entry only exists because of this Transaction, so it goes when the Transaction does.
		transactionId: uuid("transaction_id").references(() => transaction.id, {
			onDelete: "cascade",
		}),
		note: text("note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("goal_fund_entry_goal_date_idx").on(table.goalId, table.date),
		// One interest row per Fund per Transaction keeps the split idempotent.
		uniqueIndex("goal_fund_entry_goal_transaction_idx").on(table.goalId, table.transactionId),
	],
);
