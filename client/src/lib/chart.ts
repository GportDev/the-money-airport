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

export const CHART_GRID = { vertical: false, stroke: "var(--chart-grid)" } as const;

export const CHART_AXIS = {
	axisLine: false,
	tickLine: false,
	tick: { fontSize: 12, fill: "var(--muted-foreground)" },
} as const;

/** Line and area charts: a thin dashed guide under the pointer. */
export const LINE_CURSOR = { stroke: "var(--border-strong)", strokeDasharray: "3 3" } as const;

/** Bar charts: a soft rounded column instead of a full-bleed gray block. */
export const BAR_CURSOR = { fill: "var(--foreground)", fillOpacity: 0.04, radius: 6 } as const;

/** Hovered point: a small dot with a white ring so it reads on any series color. */
export const ACTIVE_DOT = { r: 4, stroke: "var(--card)", strokeWidth: 2 } as const;

export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/** The tooltip stays inside the chart and follows the pointer without lag. */
export const TOOLTIP_PROPS = {
	allowEscapeViewBox: { x: false, y: false },
	offset: 12,
	isAnimationActive: false,
	wrapperStyle: { outline: "none", zIndex: 20 },
} as const;

/** Area fill gradient id for a series color token, e.g. `areaFill("primary")`. */
export function areaFill(token: string) {
	return `url(#chart-fill-${token})`;
}
