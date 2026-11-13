import { CreditCard } from "lucide-react";
import { Sparkline } from "@/components/accounts/sparkline";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { ForecastRow } from "@/types";

type Props = {
	row: ForecastRow;
	currency: string;
	/** Name of the card that pays this row, if any. */
	cardName: string | null;
	/** Name of the Fund a savings row grows, if any. */
	fundName: string | null;
	onOpen: (row: ForecastRow) => void;
};

export function ForecastRowItem({ row, currency, cardName, fundName, onOpen }: Props) {
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(row)}
				className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
			>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-medium">{row.name}</span>
					{cardName || fundName ? (
						<span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
							{cardName ? <CreditCard aria-hidden className="size-3" /> : null}
							{cardName ?? fundName}
						</span>
					) : null}
				</span>
				<span aria-hidden className="hidden sm:block">
					<Sparkline points={row.sparkline.map((value) => ({ value }))} width={96} height={20} />
				</span>
				<Amount className="w-32 text-right text-muted-foreground">
					{formatMoney(row.typicalMonthly, currency)}/mo
				</Amount>
			</button>
		</li>
	);
}
