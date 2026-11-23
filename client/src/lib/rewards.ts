import { formatMoney } from "@/lib/format";
import type { RewardCurrency } from "@/types";

const UNIT_LABELS: Record<RewardCurrency, string> = {
	cash_back: "cash back",
	points: "pts",
	miles: "mi",
};

export function isCashBack(rewardCurrency: RewardCurrency) {
	return rewardCurrency === "cash_back";
}

export function rewardUnitLabel(rewardCurrency: RewardCurrency) {
	return UNIT_LABELS[rewardCurrency];
}

/** 200 per $100 reads "2%" for cash back and "2x" for points or miles. */
export function formatRewardRate(ratePer100: number, rewardCurrency: RewardCurrency) {
	const rate = ratePer100 / 100;
	return isCashBack(rewardCurrency) ? `${rate}%` : `${rate}x`;
}

/** Cash back units are cents and read as money; points and miles read as a whole count. */
export function formatRewardUnits(units: number, rewardCurrency: RewardCurrency, currency: string) {
	return isCashBack(rewardCurrency)
		? formatMoney(units, currency)
		: Math.round(units).toLocaleString("en-US");
}
