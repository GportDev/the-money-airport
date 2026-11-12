const SERIES_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
] as const;

/** Series ink for the nth line or slice; wraps after six. */
export function seriesColor(index: number) {
	return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
}

/** "$1.2K"-style axis label. */
export function formatCompactMoney(cents: number, currency: string) {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: 1,
		}).format(cents / 100);
	} catch {
		return String(Math.round(cents / 100));
	}
}
