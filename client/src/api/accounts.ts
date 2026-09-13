import type { BankAccount, NetWorth } from "../types";
import { api } from "./client";

export function getAccounts() {
	return api<BankAccount[]>("/accounts");
}

export function getNetWorth(range = "1m") {
	return api<NetWorth>(`/accounts/net-worth?range=${range}`);
}

export function createAccount(body: {
	name: string;
	type: string;
	displayGroup: BankAccount["displayGroup"];
	currentBalance: number;
	isoCurrencyCode?: string;
	creditLimit?: number | null;
}) {
	return api<BankAccount>("/accounts", { method: "POST", body: JSON.stringify(body) });
}

export function updateAccount(
	id: string,
	body: {
		name?: string;
		currentBalance?: number;
		creditLimit?: number | null;
		isHidden?: boolean;
	},
) {
	return api<BankAccount>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteAccount(id: string) {
	return api<{ success: true }>(`/accounts/${id}`, { method: "DELETE" });
}
