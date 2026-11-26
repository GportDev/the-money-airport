import { cn } from "@/lib/cn";

type Props = {
	value: number;
	/** The list's largest value; the bar shows `value` as a share of it. */
	max: number;
	/** Fill color, e.g. a Category's own color. Defaults to the first chart ink. */
	color?: string;
	className?: string;
};

/** A 4px share-of-largest bar that sits under a row label. */
export function ShareBar({ value, max, color, className }: Props) {
	const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
	return (
		<span
			aria-hidden
			className={cn(
				"block h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]",
				className,
			)}
		>
			<span
				className="block h-full rounded-full bg-chart-1 transition-[width] duration-300 ease-out motion-reduce:transition-none"
				// Width tracks live data and the fill may be a Category color, so both are inline.
				style={{ width: `${percent}%`, backgroundColor: color }}
			/>
		</span>
	);
}
