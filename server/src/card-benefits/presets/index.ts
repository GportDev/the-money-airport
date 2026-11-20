import type { CardPreset, CardPresetSummary } from "../card-benefits.types";
import { appleCard } from "./apple-card";
import { blueCashPreferred } from "./blue-cash-preferred";
import { deltaSkymilesReserve } from "./delta-skymiles-reserve";
import { flatCashBack1 } from "./flat-cash-back-1";
import { flatCashBack15 } from "./flat-cash-back-1-5";
import { flatCashBack2 } from "./flat-cash-back-2";
import { hiltonHonorsAmex } from "./hilton-honors-amex";
import { primeVisa } from "./prime-visa";
import { samsClubMastercard, samsClubMastercardPlus } from "./sams-club-mastercard";

/** Every Card product the User can pick. A new product is one file here and one line below. */
export const CARD_PRESETS: CardPreset[] = [
	appleCard,
	blueCashPreferred,
	deltaSkymilesReserve,
	hiltonHonorsAmex,
	primeVisa,
	samsClubMastercardPlus,
	samsClubMastercard,
	flatCashBack1,
	flatCashBack15,
	flatCashBack2,
];

export function findPreset(key: string) {
	return CARD_PRESETS.find((preset) => preset.key === key) ?? null;
}

export function presetSummaries(): CardPresetSummary[] {
	return CARD_PRESETS.map((preset) => ({
		key: preset.key,
		issuer: preset.issuer,
		productName: preset.benefits.productName,
	}));
}
