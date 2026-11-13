import { useState } from "react";
import { CardTermsForm } from "@/components/accounts/card-terms-form";
import { LastStatement } from "@/components/accounts/last-statement";
import { ManualStatementForm } from "@/components/accounts/manual-statement-form";
import { StatementPeriods } from "@/components/accounts/statement-periods";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { BankAccount, CardSummary } from "@/types";

type Props = {
	account: BankAccount;
	card: CardSummary;
};

/** Statement, current period spend, Projected interest, Card terms, and Statement periods. */
export function CreditSection({ account, card }: Props) {
	const [isStatementFormOpen, setStatementFormOpen] = useState(false);
	const currency = account.isoCurrencyCode;
	return (
		<section
			aria-label="Credit card"
			className="flex flex-col gap-4 border-t border-border px-4 py-4"
		>
			{card.latestStatement ? (
				<LastStatement statement={card.latestStatement} currency={currency} />
			) : (
				<p className="text-sm text-muted-foreground">No statement yet.</p>
			)}
			<dl className="grid grid-cols-2 gap-2 text-sm">
				<div>
					<dt className="text-xs text-muted-foreground">Current period spend</dt>
					<dd>
						<Amount>{formatMoney(card.currentPeriodSpend, currency)}</Amount>
					</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Projected interest</dt>
					<dd>
						{account.aprBps === null ? (
							<span className="text-muted-foreground">Add APR</span>
						) : (
							<Amount>{formatMoney(card.projectedInterest, currency)}</Amount>
						)}
					</dd>
				</div>
			</dl>
			<CardTermsForm key={account.aprBps ?? "none"} account={account} card={card} />
			<button
				type="button"
				aria-expanded={isStatementFormOpen}
				onClick={() => setStatementFormOpen((value) => !value)}
				className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
			>
				+ Statement
			</button>
			{isStatementFormOpen ? (
				<ManualStatementForm accountId={account.id} onDone={() => setStatementFormOpen(false)} />
			) : null}
			<StatementPeriods accountId={account.id} currency={currency} />
		</section>
	);
}
