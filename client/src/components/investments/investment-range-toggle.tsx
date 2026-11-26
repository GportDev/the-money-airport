import { Segmented } from "@/components/ui/segmented";
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
		<Segmented aria-label="Timeframe" value={value} options={OPTIONS} onValueChange={onChange} />
	);
}
