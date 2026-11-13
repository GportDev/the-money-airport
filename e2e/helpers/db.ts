/** The database Playwright's server uses, so direct seeds land in the same one. */
export function databaseName() {
	const url = process.env.DATABASE_URL ?? "postgresql://money:money@localhost:5433/money_airport";
	return new URL(url).pathname.slice(1);
}
