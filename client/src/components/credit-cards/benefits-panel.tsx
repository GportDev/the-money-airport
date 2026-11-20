import { CardBenefitsDetails } from "@/components/credit-cards/card-benefits-details";
import { CardProductPicker } from "@/components/credit-cards/card-product-picker";
import type { CreditCard } from "@/types";

/** The selected card's Card product and what it gives back. */
export function BenefitsPanel({ card }: { card: CreditCard }) {
	return (
		<section
			aria-label="Benefits"
			className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-sm"
		>
			<h2 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
				Benefits
				<span className="font-normal text-muted-foreground">{card.name}</span>
			</h2>
			<CardProductPicker card={card} />
			{card.benefits && card.rewards ? (
				<CardBenefitsDetails
					benefits={card.benefits}
					rewards={card.rewards}
					currency={card.isoCurrencyCode}
				/>
			) : (
				<p className="text-muted-foreground">
					Pick a Card product to track rewards and Benefit credits for this card.
				</p>
			)}
		</section>
	);
}
