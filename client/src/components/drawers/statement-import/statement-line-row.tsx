import { Amount } from "@/components/ui/amount";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";

type Props = {
	date: string;
	name: string;
	amount: number;
	currency: string;
};

/** A statement line or a hand-entered Transaction: date and name, amount on the right. */
export function StatementLineRow({ date, name, amount, currency }: Props) {
	return (
		<span className="flex min-w-0 justify-between gap-2">
			<span className="truncate">
				<span className="text-muted-foreground">{shortDate(date)}</span> {name}
			</span>
			<Amount>{formatMoney(amount, currency)}</Amount>
		</span>
	);
}
