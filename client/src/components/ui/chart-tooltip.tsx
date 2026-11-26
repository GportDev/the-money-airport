import type { TooltipPayloadEntry } from "recharts";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";

type Props = {
	active?: boolean;
	payload?: readonly TooltipPayloadEntry[];
	label?: string | number;
	formatValue: (value: number) => string;
	formatLabel?: (label: string) => string;
	/** Display names by dataKey; falls back to the series name. */
	names?: Record<string, string>;
	/** Series drawn dashed (a previous period) get a dashed swatch. */
	dashedKeys?: readonly string[];
	showTotal?: boolean;
};

/** The hover card for every chart: date header, one swatch row per series, mono amounts. */
export function ChartTooltip({
	active,
	payload,
	label,
	formatValue,
	formatLabel,
	names,
	dashedKeys,
	showTotal,
}: Props) {
	const rows = (payload ?? []).filter((entry) => typeof entry.value === "number");
	if (!active || rows.length === 0) return null;
	const total = rows.reduce((sum, entry) => sum + Number(entry.value), 0);
	const heading = label === undefined ? null : formatLabel ? formatLabel(String(label)) : label;

	return (
		<div className="min-w-40 max-w-60 animate-fade-in rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-pop">
			{heading ? <p className="mb-1.5 text-xs text-muted-foreground">{heading}</p> : null}
			<ul className="flex flex-col gap-1">
				{rows.map((entry) => (
					<TooltipRow
						key={String(entry.dataKey ?? entry.name)}
						entry={entry}
						name={names?.[String(entry.dataKey)] ?? String(entry.name ?? "")}
						isDashed={dashedKeys?.includes(String(entry.dataKey)) ?? false}
						value={formatValue(Number(entry.value))}
					/>
				))}
			</ul>
			{showTotal && rows.length > 1 ? (
				<p className="mt-1.5 flex items-baseline justify-between gap-4 border-t border-border pt-1.5">
					<span className="text-muted-foreground">Total</span>
					<Amount>{formatValue(total)}</Amount>
				</p>
			) : null}
		</div>
	);
}

function TooltipRow({
	entry,
	name,
	isDashed,
	value,
}: {
	entry: TooltipPayloadEntry;
	name: string;
	isDashed: boolean;
	value: string;
}) {
	const color = entry.color ?? (entry.payload as { fill?: string } | undefined)?.fill;
	return (
		<li className="flex items-baseline justify-between gap-4">
			<span className="flex min-w-0 items-center gap-2">
				<span
					aria-hidden
					className={cn(
						"size-2 shrink-0 rounded-[3px]",
						isDashed && "border border-dashed bg-transparent",
					)}
					// Series colors come from the chart at runtime, so they cannot be classes.
					style={isDashed ? { borderColor: color } : { backgroundColor: color }}
				/>
				<span className="truncate">{name}</span>
			</span>
			<Amount>{value}</Amount>
		</li>
	);
}
