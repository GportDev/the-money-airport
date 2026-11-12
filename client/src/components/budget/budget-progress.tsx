import { cn } from "@/lib/cn";

type Props = {
	label: string;
	planned: number;
	actual: number;
	isOver: boolean;
	className?: string;
};

/** Thin bar: green while under plan, red once over. Empty when nothing is planned. */
export function BudgetProgress({ label, planned, actual, isOver, className }: Props) {
	const percent = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(percent)}
			className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
		>
			<div
				className={cn("h-full rounded-full", isOver ? "bg-negative" : "bg-positive")}
				// Width tracks live data, so it cannot be a static class.
				style={{ width: `${percent}%` }}
			/>
		</div>
	);
}
