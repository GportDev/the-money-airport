import { Check, CreditCard as CreditCardIcon } from "lucide-react";
import { CardTileFacts } from "@/components/credit-cards/card-tile-facts";
import { CardUsage } from "@/components/credit-cards/card-usage";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { CreditCard } from "@/types";

type Props = {
	card: CreditCard;
	isSelected: boolean;
	onSelect: () => void;
};

/** One credit card at a glance; pressing it shows that card in the detail column. */
export function CreditCardTile({ card, isSelected, onSelect }: Props) {
	const mask = card.mask ? ` …${card.mask}` : "";
	return (
		<li
			className={cn(
				"relative rounded-xl border border-border p-4 text-sm transition-colors",
				isSelected ? "bg-primary/5" : "bg-card hover:bg-foreground/5",
			)}
		>
			{/* Laid over the tile, with the content click-through, so the facts stay a real list. */}
			<button
				type="button"
				aria-pressed={isSelected}
				aria-label={`${card.name}${mask}`}
				onClick={onSelect}
				className="absolute inset-0 rounded-xl"
			/>
			<div className="pointer-events-none flex flex-col gap-3">
				<div className="flex items-center gap-3">
					{card.institutionLogo ? (
						<img
							src={`data:image/png;base64,${card.institutionLogo}`}
							alt=""
							className="size-8 shrink-0 rounded-sm"
						/>
					) : (
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
							<CreditCardIcon aria-hidden className="size-4 text-muted-foreground" />
						</span>
					)}
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="truncate font-medium">
							{card.name}
							<span className="font-normal text-muted-foreground">{mask}</span>
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{card.benefits?.productName ?? "No card product"}
						</span>
					</div>
					{isSelected ? <Check aria-hidden className="size-4 shrink-0 text-primary" /> : null}
				</div>
				<div className="flex flex-col">
					<span className="text-xs text-muted-foreground">Current balance</span>
					<Amount className="text-2xl font-semibold">
						{formatMoney(card.currentBalance, card.isoCurrencyCode)}
					</Amount>
				</div>
				<CardUsage card={card} />
				<CardTileFacts card={card} />
			</div>
		</li>
	);
}
