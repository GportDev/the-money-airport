import { execFileSync } from "node:child_process";

export function seedFxRate(from: string, to: string, rate: string) {
	const date = new Date().toISOString().slice(0, 10);
	execFileSync("docker", [
		"exec",
		"money-airport-postgres",
		"psql",
		"-U",
		"money",
		"-d",
		"money_airport",
		"-c",
		`insert into fx_rate (date, from_currency, to_currency, rate, source) values ('${date}', '${from}', '${to}', ${rate}, 'test') on conflict (date, from_currency, to_currency) do update set rate = excluded.rate;`,
	]);
}
