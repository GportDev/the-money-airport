import { defineConfig } from "@playwright/test";

const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://money:money@localhost:5433/money_airport";

export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: "http://localhost:5173",
	},
	webServer: [
		{
			command: "pnpm exec drizzle-kit push --config drizzle.config.ts && pnpm start:dev",
			cwd: "server",
			url: "http://localhost:3000/api/health",
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			name: "server",
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
				BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "playwright-better-auth-secret-32ch",
				BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
			},
		},
		{
			command: "pnpm --filter client dev",
			url: "http://localhost:5173",
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			name: "client",
		},
	],
});
