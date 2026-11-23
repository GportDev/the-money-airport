import { CreditCard as CreditCardIcon } from "lucide-react";
import { CardTileFacts } from "@/components/credit-cards/card-tile-facts";
import { CardUsage } from "@/components/credit-cards/card-usage";
import type { CreditCard } from "@/types";

/** What an open card shows under its name: product, usage, and the card facts. */
export function CardTileDetails({ card }: { card: CreditCard }) {
	return (
		<div className="flex flex-col gap-3 px-4 pb-4">
			<div className="flex items-center gap-2">
				{card.institutionLogo ? (
					<img
						src={`data:image/png;base64,${card.institutionLogo}`}
						alt=""
						className="size-6 shrink-0 rounded-sm"
					/>
				) : (
					<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
						<CreditCardIcon aria-hidden className="size-3.5 text-muted-foreground" />
					</span>
				)}
				<span className="truncate text-xs text-muted-foreground">
					{card.benefits?.productName ?? "No card product"}
				</span>
			</div>
			<CardUsage card={card} />
			<CardTileFacts card={card} />
		</div>
	);
}
