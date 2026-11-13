import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Amount } from "@/components/ui/amount";
import { useUpdateAccount } from "@/hooks/use-accounts";
import { useAmortization, useSetLoanTerms } from "@/hooks/use-liabilities";
import { bpsToPercentText, monthName, percentTextToBps } from "@/lib/debt";
import { centsToMajorUnits, formatMoney, majorUnitsToCents } from "@/lib/format";
import type { BankAccount } from "@/types";

type Props = {
	account: BankAccount;
};

const centsText = (cents: number | null | undefined) =>
	cents === null || cents === undefined ? "" : centsToMajorUnits(cents);
const textCents = (text: string) => (text.trim() === "" ? null : majorUnitsToCents(text));
const textNumber = (text: string) => (text.trim() === "" ? null : Number(text));

/** Loan terms; leave APR and term empty for a balance-only loan. */
export function LoanSection({ account }: Props) {
	const loan = account.loan;
	const updateAccount = useUpdateAccount();
	const setTerms = useSetLoanTerms();
	const amortization = useAmortization(account.id, undefined, Boolean(loan?.scheduledPayment));
	const [fields, setFields] = useState({
		apr: bpsToPercentText(account.aprBps),
		principal: centsText(loan?.principal),
		term: loan?.termMonths ? String(loan.termMonths) : "",
		firstPaymentDate: loan?.firstPaymentDate ?? "",
		paymentDay: loan?.paymentDay ? String(loan.paymentDay) : "",
		scheduled: loan?.source === "manual" ? "" : centsText(loan?.scheduledPayment),
		extra: centsText(loan?.extraPayment ?? 0),
	});
	const isBusy = updateAccount.isPending || setTerms.isPending;
	const currency = account.isoCurrencyCode;

	function field(key: keyof typeof fields, label: string, type: "number" | "date" = "number") {
		return (
			<label className="flex flex-col gap-1" htmlFor={`loan-${key}`}>
				{label}
				<input
					id={`loan-${key}`}
					className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
					type={type}
					step={type === "number" ? "0.01" : undefined}
					min={type === "number" ? "0" : undefined}
					value={fields[key]}
					onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
				/>
			</label>
		);
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		try {
			await updateAccount.mutateAsync({ id: account.id, aprBps: percentTextToBps(fields.apr) });
			await setTerms.mutateAsync({
				accountId: account.id,
				principal: textCents(fields.principal),
				termMonths: textNumber(fields.term),
				firstPaymentDate: fields.firstPaymentDate || null,
				paymentDay: textNumber(fields.paymentDay),
				scheduledPayment: textCents(fields.scheduled),
				extraPayment: textCents(fields.extra) ?? 0,
			});
			toast.success("Loan terms saved");
		} catch (_error) {
			toast.error("Could not save loan terms");
		}
	}

	return (
		<section
			aria-label="Loan"
			className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm"
		>
			{amortization.data ? (
				<dl className="grid grid-cols-3 gap-2">
					<div>
						<dt className="text-xs text-muted-foreground">Payment</dt>
						<dd>
							<Amount>{formatMoney(amortization.data.basePayment, currency)}</Amount>
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Payoff</dt>
						<dd>{monthName(amortization.data.basePayoffDate.slice(0, 7))}</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Total interest</dt>
						<dd>
							<Amount>{formatMoney(amortization.data.baseTotalInterest, currency)}</Amount>
						</dd>
					</div>
				</dl>
			) : (
				<p className="text-muted-foreground">Balance-only until it has an APR and term.</p>
			)}
			<form className="grid grid-cols-2 gap-3" onSubmit={onSubmit} aria-label="Loan terms">
				{field("apr", "APR (%)")}
				{field("principal", "Principal")}
				{field("term", "Term (months)")}
				{field("firstPaymentDate", "First payment date", "date")}
				{field("paymentDay", "Payment day")}
				{field("scheduled", "Scheduled payment")}
				{field("extra", "Extra monthly payment")}
				<button
					type="submit"
					disabled={isBusy}
					className="col-span-2 self-start rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5 disabled:opacity-60"
				>
					Save loan terms
				</button>
			</form>
			<Link
				to="/forecast?tab=debt"
				className="self-start text-sm text-primary underline-offset-2 hover:underline"
			>
				View payoff
			</Link>
		</section>
	);
}
