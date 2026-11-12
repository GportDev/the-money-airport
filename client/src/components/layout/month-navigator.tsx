import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/month";

type Props = {
	year: number;
	month: number;
	onShift: (delta: number) => void;
};

export function MonthNavigator({ year, month, onShift }: Props) {
	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				className="rounded-md p-2 transition-colors hover:bg-foreground/5"
				aria-label="Previous month"
				onClick={() => onShift(-1)}
			>
				<ChevronLeft aria-hidden className="size-4" />
			</button>
			<p className="min-w-32 text-center text-sm font-medium" aria-live="polite">
				{monthLabel(year, month)}
			</p>
			<button
				type="button"
				className="rounded-md p-2 transition-colors hover:bg-foreground/5"
				aria-label="Next month"
				onClick={() => onShift(1)}
			>
				<ChevronRight aria-hidden className="size-4" />
			</button>
		</div>
	);
}
