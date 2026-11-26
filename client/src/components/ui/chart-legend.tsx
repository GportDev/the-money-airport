import { cn } from "@/lib/cn";

type Item = {
	label: string;
	/** A Tailwind background class for the swatch, e.g. "bg-positive". */
	swatchClassName: string;
	shape?: "square" | "line" | "dashed";
};

/** Small legend for a chart card header: swatch + label per series. */
export function ChartLegend({ items, className }: { items: Item[]; className?: string }) {
	return (
		<ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
			{items.map((item) => (
				<li key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
					<LegendSwatch swatchClassName={item.swatchClassName} shape={item.shape ?? "square"} />
					{item.label}
				</li>
			))}
		</ul>
	);
}

function LegendSwatch({
	swatchClassName,
	shape,
}: {
	swatchClassName: string;
	shape: NonNullable<Item["shape"]>;
}) {
	if (shape === "dashed") {
		return (
			<span aria-hidden className="flex w-3.5 justify-between">
				<span className={cn("h-0.5 w-1.5 rounded-full", swatchClassName)} />
				<span className={cn("h-0.5 w-1.5 rounded-full", swatchClassName)} />
			</span>
		);
	}
	return (
		<span
			aria-hidden
			className={cn(
				shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2 rounded-[3px]",
				swatchClassName,
			)}
		/>
	);
}
