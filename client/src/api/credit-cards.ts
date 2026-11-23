import { api } from "@/api/client";
import type { CardBenefits, CardPresetSummary, CreditCard } from "@/types";

export function getCreditCards() {
	return api<CreditCard[]>("/credit-cards");
}

export function getCardPresets() {
	return api<CardPresetSummary[]>("/credit-cards/presets");
}

export function setCardProduct({ accountId, presetKey }: { accountId: string; presetKey: string }) {
	return api<CardBenefits>(`/accounts/${accountId}/card-benefits`, {
		method: "PUT",
		body: JSON.stringify({ presetKey }),
	});
}

export function removeCardProduct(accountId: string) {
	return api<{ success: true }>(`/accounts/${accountId}/card-benefits`, { method: "DELETE" });
}

export function reorderCreditCards(accountIds: string[]) {
	return api<{ success: true }>("/credit-cards/order", {
		method: "PUT",
		body: JSON.stringify({ accountIds }),
	});
}
