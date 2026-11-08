import type { QueryClient } from "@tanstack/react-query";

/** A sync, connect, or BankAccount edit can change balances, Transactions, and every rollup. */
export function invalidateLedger(client: QueryClient) {
	return Promise.all([
		client.invalidateQueries({ queryKey: ["accounts"] }),
		client.invalidateQueries({ queryKey: ["transactions"] }),
		client.invalidateQueries({ queryKey: ["cash-flow"] }),
		client.invalidateQueries({ queryKey: ["dashboard"] }),
	]);
}
