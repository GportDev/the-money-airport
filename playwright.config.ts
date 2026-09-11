import { defineConfig } from "@playwright/test";

const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://gportdev@localhost:5432/money_airport";

export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: "http://localhost:5173",
	},
	webServer: [
		{
			command: "pnpm --filter server start:dev",
			url: "http://localhost:3000/api/health",
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			name: "server",
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
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
