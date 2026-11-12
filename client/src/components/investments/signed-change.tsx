import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatSignedMoney } from "@/lib/format";

type Props = { cents: number; currency: string; percent?: number; className?: string };

/** "+$2,000.00 (19.0%)": green up, red down, plain when flat. */
export function SignedChange({ cents, currency, percent, className }: Props) {
	return (
		<Amount className={cn(cents > 0 && "text-positive", cents < 0 && "text-negative", className)}>
			{formatSignedMoney(cents, currency)}
			{percent === undefined ? "" : ` (${(percent * 100).toFixed(1)}%)`}
		</Amount>
	);
}
