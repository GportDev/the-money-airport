import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
	year: number;
	onShift: (delta: number) => void;
};

export function YearNavigator({ year, onShift }: Props) {
	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				className="rounded-md p-2 transition-colors hover:bg-foreground/5"
				aria-label="Previous year"
				onClick={() => onShift(-1)}
			>
				<ChevronLeft aria-hidden className="size-4" />
			</button>
			<p className="min-w-16 text-center text-sm font-medium" aria-live="polite">
				{year}
			</p>
			<button
				type="button"
				className="rounded-md p-2 transition-colors hover:bg-foreground/5"
				aria-label="Next year"
				onClick={() => onShift(1)}
			>
				<ChevronRight aria-hidden className="size-4" />
			</button>
		</div>
	);
}
