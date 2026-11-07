import type { QueryClient } from "@tanstack/react-query";

/** A sync, connect, or BankAccount edit can change balances and Transactions together. */
export function invalidateLedger(client: QueryClient) {
	return Promise.all([
		client.invalidateQueries({ queryKey: ["accounts"] }),
		client.invalidateQueries({ queryKey: ["transactions"] }),
		client.invalidateQueries({ queryKey: ["cash-flow"] }),
	]);
}
