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
		<span
			title={`${gain} with ${cardLabel}`}
			className={cn(
				"inline-flex max-w-44 shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground",
				className,
			)}
		>
			<span className="truncate">{`Better with ${betterCard.name}`}</span>
			<span className="sr-only">{`, ${gain}`}</span>
		</span>
	);
}
