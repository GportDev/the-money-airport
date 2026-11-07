const UNOFFICIAL = new Set(["BTC", "ETH", "USDT", "USDC", "XBT", "DOGE", "SOL", "XXX", "XTS"]);

export function formatMoney(cents: number, currency = "USD") {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(cents / 100);
	} catch {
		return `${currency} ${(cents / 100).toFixed(2)}`;
	}
}

export function majorUnitsToCents(value: string) {
	return Math.round(Number(value) * 100);
}

export function centsToMajorUnits(cents: number) {
	return (cents / 100).toFixed(2);
}

export function isUnofficialCurrency(code: string) {
	return !/^[A-Z]{3}$/.test(code) || UNOFFICIAL.has(code);
}

export function formatSyncedAt(iso: string | null) {
	if (!iso) {
		return null;
	}
	const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
	if (hours < 1) {
		return "just now";
	}
	if (hours < 24) {
		return `${hours}h ago`;
	}
	return `${Math.floor(hours / 24)}d ago`;
}

/** "August 13, 2026" for a YYYY-MM-DD date, without shifting by the local timezone. */
export function formatLongDate(isoDate: string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "long",
		timeZone: "UTC",
	}).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Signed money: "+$0.59" for income, "-$4.75" for spend. */
export function formatSignedMoney(cents: number, currency = "USD") {
	const formatted = formatMoney(Math.abs(cents), currency);
	return cents > 0 ? `+${formatted}` : cents < 0 ? `-${formatted}` : formatted;
}

export function todayIso() {
	const now = new Date();
	const offset = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
