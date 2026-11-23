import type { CardPerk } from "@/types";

export function CardPerks({ perks }: { perks: CardPerk[] }) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="font-medium">Perks</h3>
			<ul className="flex flex-col gap-1.5">
				{perks.map((perk) => (
					<li key={perk.label}>
						<p>{perk.label}</p>
						{perk.description ? (
							<p className="text-xs text-muted-foreground">{perk.description}</p>
						) : null}
					</li>
				))}
			</ul>
		</div>
	);
}
