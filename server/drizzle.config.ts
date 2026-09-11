import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema/index.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgresql://money:money@localhost:5433/money_airport",
	},
});
