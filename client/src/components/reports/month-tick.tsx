import type { KeyboardEvent } from "react";
import { reportMonthLabel } from "@/lib/report-range";

type Props = {
	x?: number | string;
	y?: number | string;
	payload?: { value?: unknown };
	onSelect: (month: string) => void;
};

function shortLabel(month: string) {
	return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
		new Date(`${month}-01T00:00:00Z`),
	);
}

/** X-axis month label that opens the month's transactions, by mouse or keyboard. */
export function MonthTick({ x = 0, y = 0, payload, onSelect }: Props) {
	const value = payload?.value;
	if (typeof value !== "string") return null;
	const month = value;
	function onKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSelect(month);
		}
	}
	return (
		// biome-ignore lint/a11y/useSemanticElements: an HTML <button> cannot sit inside the chart's SVG.
		<g
			role="button"
			tabIndex={0}
			aria-label={`Show transactions for ${reportMonthLabel(month)}`}
			transform={`translate(${x},${y})`}
			className="cursor-pointer outline-none [&:focus-visible_text]:underline"
			onClick={() => onSelect(month)}
			onKeyDown={onKeyDown}
		>
			<text dy={14} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
				{shortLabel(month)}
			</text>
		</g>
	);
}
