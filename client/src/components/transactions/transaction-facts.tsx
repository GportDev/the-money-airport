import { BetterCardBadge } from "@/components/transactions/better-card-badge";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail };

/** Drawer facts: status, account, the better card, split, and refund state. */
export function TransactionFacts({ transaction }: Props) {
	const account = transaction.account
		? `${transaction.account.name}${transaction.account.mask ? ` …${transaction.account.mask}` : ""}`
		: "Manual · no account";
	return (
		<dl
			aria-label="Details"
			className="mx-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-lg border border-border p-3 text-sm"
		>
			<dt className="text-muted-foreground">Status</dt>
			<dd>{transaction.pending ? "Pending" : "Posted"}</dd>
			<dt className="text-muted-foreground">Account</dt>
			<dd className="truncate">{account}</dd>
			<dt className="text-muted-foreground">Best card</dt>
			<dd>
				{transaction.betterCard ? (
					<BetterCardBadge
						betterCard={transaction.betterCard}
						currency={transaction.isoCurrencyCode}
					/>
				) : (
					<span>{transaction.account?.name ?? "—"}</span>
				)}
			</dd>
			<dt className="text-muted-foreground">Split</dt>
			<dd>{transaction.split ? `${transaction.split.parts.length} parts` : "Not split"}</dd>
			<dt className="text-muted-foreground">Refund</dt>
			<dd>{refundLabel(transaction)}</dd>
		</dl>
	);
}

function refundLabel(transaction: TransactionDetail) {
	if (transaction.refund.of) {
		return `Refund of ${transaction.refund.of.merchantName ?? transaction.refund.of.name}`;
	}
	const count = transaction.refund.refundedBy.length;
	if (count > 0) {
		return count === 1 ? "Refunded once" : `Refunded ${count} times`;
	}
	return "None";
}
