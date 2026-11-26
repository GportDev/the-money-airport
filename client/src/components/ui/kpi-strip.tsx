import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";

/** One card split into headline cells by hairlines; cells stack below `md`. Each cell is a region. */
function KpiStrip({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div
			className={cn(
				"grid divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:auto-cols-fr md:grid-flow-col md:divide-x md:divide-y-0",
				className,
			)}
		>
			{children}
		</div>
	);
}

type CellProps = {
	label: string;
	value: string;
	/** Tailwind background class for the 8px marker, e.g. "bg-positive". */
	markerClassName?: string;
	/** Signed change line, already formatted ("+12.4%"); omitted when there is no comparison. */
	delta?: { text: string; tone: "positive" | "negative" | "neutral" };
	/** What the delta compares against, e.g. "vs $3,100.00". */
	comparison?: string;
};

function KpiCell({ label, value, markerClassName, delta, comparison }: CellProps) {
	return (
		<section aria-label={label} className="flex min-w-0 flex-col gap-1.5 px-5 py-4">
			<h2 className="flex items-center gap-2 text-[13px] font-normal text-muted-foreground">
				{markerClassName ? (
					<span aria-hidden className={cn("size-2 rounded-[3px]", markerClassName)} />
				) : null}
				{label}
			</h2>
			<div className="flex flex-col gap-1">
				<Amount className="truncate text-[28px] leading-none font-normal tracking-[-0.03em]">
					{value}
				</Amount>
				{delta ? (
					<span className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
						<span
							className={cn(
								delta.tone === "positive" && "text-positive",
								delta.tone === "negative" && "text-negative",
								delta.tone === "neutral" && "text-muted-foreground",
							)}
						>
							{delta.text}
						</span>
						{comparison ? <span className="text-muted-foreground">{comparison}</span> : null}
					</span>
				) : null}
			</div>
		</section>
	);
}

export { KpiCell, KpiStrip };
