import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
	year: number;
	onShift: (delta: number) => void;
};

export function YearNavigator({ year, onShift }: Props) {
	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				type="button"
				aria-label="Previous year"
				onClick={() => onShift(-1)}
			>
				<ChevronLeft aria-hidden className="size-4" />
			</Button>
			<p className="min-w-16 text-center text-sm font-medium" aria-live="polite">
				{year}
			</p>
			<Button
				variant="ghost"
				size="icon"
				type="button"
				aria-label="Next year"
				onClick={() => onShift(1)}
			>
				<ChevronRight aria-hidden className="size-4" />
			</Button>
		</div>
	);
}
