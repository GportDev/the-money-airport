import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/month";

type Props = {
	year: number;
	month: number;
	onShift: (delta: number) => void;
};

export function MonthNavigator({ year, month, onShift }: Props) {
	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				type="button"
				aria-label="Previous month"
				onClick={() => onShift(-1)}
			>
				<ChevronLeft aria-hidden className="size-4" />
			</Button>
			<p className="min-w-32 text-center text-sm font-medium" aria-live="polite">
				{monthLabel(year, month)}
			</p>
			<Button
				variant="ghost"
				size="icon"
				type="button"
				aria-label="Next month"
				onClick={() => onShift(1)}
			>
				<ChevronRight aria-hidden className="size-4" />
			</Button>
		</div>
	);
}
