import { execFileSync } from "node:child_process";
import { databaseName } from "./db";

/** Sets a Transaction's Plaid detailed category; manual Transactions never get one from the API. */
export function setPfcDetailed(transactionId: string, pfcDetailed: string) {
	if (!/^[0-9a-f-]{36}$/.test(transactionId) || !/^[A-Z_]{1,80}$/.test(pfcDetailed)) {
		throw new Error("Bad pfc input");
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
		`update "transaction" set plaid_pfc_detailed = '${pfcDetailed}' where id = '${transactionId}';`,
	]);
}
