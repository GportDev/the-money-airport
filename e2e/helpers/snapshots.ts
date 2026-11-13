import { execFileSync } from "node:child_process";
import { databaseName } from "./db";

/** Writes a past end-of-day balance; the API only ever records today's. */
export function seedSnapshot(bankAccountId: string, date: string, balance: number) {
	if (!/^[0-9a-f-]{36}$/.test(bankAccountId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw new Error("Bad snapshot input");
	}
	execFileSync("docker", [
		"exec",
		"money-airport-postgres",
		"psql",
		"-U",
		"money",
		"-d",
		databaseName(),
		"-c",
		`insert into account_balance_snapshot (user_id, bank_account_id, date, balance) select user_id, id, '${date}', ${Math.trunc(balance)} from bank_account where id = '${bankAccountId}' on conflict (bank_account_id, date) do update set balance = excluded.balance;`,
	]);
}

export function daysAgo(days: number) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}
