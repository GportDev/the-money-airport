import { OneOffStatusBadge } from "@/components/forecast/one-off-status-badge";
import { Amount } from "@/components/ui/amount";
import { shortDate } from "@/lib/forecast";
import { formatSignedMoney } from "@/lib/format";
import type { OneOff } from "@/types";

type Props = {
	oneOff: OneOff;
	currency: string;
	onOpen: (oneOff: OneOff) => void;
};

export function OneOffItem({ oneOff, currency, onOpen }: Props) {
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(oneOff)}
				className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
			>
				<span className="flex-1 truncate font-medium">{oneOff.name}</span>
				<span className="text-muted-foreground">{shortDate(oneOff.date)}</span>
				<OneOffStatusBadge status={oneOff.status} />
				<Amount className="w-32 text-right">{formatSignedMoney(oneOff.amount, currency)}</Amount>
			</button>
		</li>
	);
}
