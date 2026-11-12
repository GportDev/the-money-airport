import { cn } from "@/lib/cn";
import type { InvestmentRange } from "@/types";

const OPTIONS: { value: InvestmentRange; label: string }[] = [
	{ value: "1m", label: "1 month" },
	{ value: "3m", label: "3 months" },
	{ value: "1y", label: "1 year" },
];

type Props = {
	value: InvestmentRange;
	onChange: (range: InvestmentRange) => void;
};

export function InvestmentRangeToggle({ value, onChange }: Props) {
	return (
		<fieldset className="flex rounded-md border border-border bg-card p-0.5 text-sm">
			<legend className="sr-only">Timeframe</legend>
			{OPTIONS.map((option) => (
				<button
					key={option.value}
					type="button"
					aria-pressed={value === option.value}
					className={cn(
						"rounded px-2 py-1 transition-colors hover:bg-foreground/5 hover:text-foreground",
						value === option.value ? "bg-muted font-medium" : "text-muted-foreground",
					)}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</button>
			))}
		</fieldset>
	);
}
