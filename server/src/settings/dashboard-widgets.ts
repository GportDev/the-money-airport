/** V1 widgets in default order. Credit Score stays out until a bureau partner exists. */
export const DASHBOARD_WIDGET_IDS = [
	"budget",
	"net_worth",
	"spending",
	"transactions",
	"recurring",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidget = { id: DashboardWidgetId; visible: boolean; order: number };

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = DASHBOARD_WIDGET_IDS.map(
	(id, order) => ({
		id,
		visible: true,
		order,
	}),
);

function isWidgetId(value: unknown): value is DashboardWidgetId {
	return typeof value === "string" && (DASHBOARD_WIDGET_IDS as readonly string[]).includes(value);
}

/**
 * Stored JSON in, a complete ordered list out: unknown ids and duplicates are dropped,
 * widgets added in a later release appear visible at the end, and order is renumbered 0..n.
 */
export function normalizeWidgets(stored: unknown): DashboardWidget[] {
	const rows = Array.isArray(stored) ? stored : [];
	const seen = new Set<DashboardWidgetId>();
	const kept: { id: DashboardWidgetId; visible: boolean; order: number }[] = [];
	rows.forEach((row: unknown, index) => {
		if (!row || typeof row !== "object") return;
		const { id, visible, order } = row as Record<string, unknown>;
		if (!isWidgetId(id) || seen.has(id)) return;
		seen.add(id);
		kept.push({
			id,
			visible: visible !== false,
			order: typeof order === "number" && Number.isFinite(order) ? order : index,
		});
	});
	kept.sort((a, b) => a.order - b.order);
	for (const id of DASHBOARD_WIDGET_IDS) {
		if (!seen.has(id)) kept.push({ id, visible: true, order: Number.POSITIVE_INFINITY });
	}
	return kept.map((row, order) => ({ id: row.id, visible: row.visible, order }));
}
