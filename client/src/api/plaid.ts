import { api } from "./client";

export function createLinkToken(itemId?: string) {
	return api<{ linkToken: string }>("/plaid/create-link-token", {
		method: "POST",
		body: JSON.stringify(itemId ? { itemId } : {}),
	});
}

export function exchangeToken(publicToken: string, institutionName?: string) {
	return api<{ item: { id: string; institutionName: string | null } }>("/plaid/exchange-token", {
		method: "POST",
		body: JSON.stringify({
			publicToken,
			metadata: institutionName ? { institution: { name: institutionName } } : undefined,
		}),
	});
}

export function syncAll() {
	return api<{ items: number }>("/plaid/sync-all", { method: "POST" });
}

export function disconnectItem(itemId: string) {
	return api<{ success: true }>(`/plaid/items/${itemId}`, { method: "DELETE" });
}

export function reconnectItem(itemId: string) {
	return api<{ success: true }>(`/plaid/items/${itemId}/reconnect`, { method: "POST" });
}
