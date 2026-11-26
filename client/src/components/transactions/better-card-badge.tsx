import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatSignedMoney } from "@/lib/format";
import type { BetterCard } from "@/types";

type Props = {
	betterCard: BetterCard;
	currency: string;
	className?: string;
};

/** Marks a card Transaction that another of the User's cards would have earned more on. */
export function BetterCardBadge({ betterCard, currency, className }: Props) {
	const gain = `${formatSignedMoney(betterCard.extraValue, currency)} est. rewards`;
	const cardLabel = betterCard.mask ? `${betterCard.name} …${betterCard.mask}` : betterCard.name;
	return (
		<Badge title={`${gain} with ${cardLabel}`} className={cn("max-w-44 font-normal", className)}>
			<span className="truncate">{`Better with ${betterCard.name}`}</span>
			<span className="sr-only">{`, ${gain}`}</span>
		</Badge>
	);
}
