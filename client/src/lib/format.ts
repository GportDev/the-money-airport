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
