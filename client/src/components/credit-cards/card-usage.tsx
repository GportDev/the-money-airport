import { Amount } from "@/components/ui/amount";
import { Progress } from "@/components/ui/progress";
import { formatPercentShare } from "@/lib/debt";
import { formatOptionalMoney } from "@/lib/format";
import type { CreditCard } from "@/types";

const FULL_USAGE = 100;

/** Available credit, the limit, and how much of the limit is used. */
export function CardUsage({ card }: { card: CreditCard }) {
	const currency = card.isoCurrencyCode;
	return (
		<div className="flex flex-col gap-2">
			<dl className="grid grid-cols-2 gap-2">
				<div>
					<dt className="text-xs text-muted-foreground">Available credit</dt>
					<dd>
						<Amount>{formatOptionalMoney(card.availableCredit, currency)}</Amount>
					</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Credit limit</dt>
					<dd>
						<Amount>{formatOptionalMoney(card.creditLimit, currency)}</Amount>
					</dd>
				</div>
			</dl>
			<p className="flex justify-between text-xs text-muted-foreground">
				<span>Usage</span>
				<Amount>{card.utilization === null ? "—" : formatPercentShare(card.utilization)}</Amount>
			</p>
			{card.utilization === null ? null : (
				<Progress
					value={Math.min(FULL_USAGE, card.utilization * FULL_USAGE)}
					aria-label={`${card.name} usage`}
				/>
			)}
		</div>
	);
}
