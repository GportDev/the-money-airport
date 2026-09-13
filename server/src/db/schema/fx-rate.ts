import { date, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const fxRate = pgTable(
	"fx_rate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		date: date("date").notNull(),
		fromCurrency: text("from_currency").notNull(),
		toCurrency: text("to_currency").notNull(),
		rate: numeric("rate").notNull(),
		source: text("source").notNull().default("frankfurter"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [unique("fx_rate_date_pair").on(table.date, table.fromCurrency, table.toCurrency)],
);
