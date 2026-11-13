import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useUpdateAccount } from "@/hooks/use-accounts";
import { bpsToPercentText, PAYMENT_RULE_OPTIONS, percentTextToBps } from "@/lib/debt";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import type { BankAccount, CardSummary, PaymentRule } from "@/types";

type Props = {
	account: BankAccount;
	card: CardSummary;
};

function dayOrNull(text: string) {
	return text.trim() === "" ? null : Number(text);
}

/** Card terms; a Plaid-filled field says so until the User overrides it. */
export function CardTermsForm({ account, card }: Props) {
	const update = useUpdateAccount();
	const [apr, setApr] = useState(bpsToPercentText(account.aprBps));
	const [closeDay, setCloseDay] = useState(
		card.statementCloseDay ? String(card.statementCloseDay) : "",
	);
	const [dueDay, setDueDay] = useState(card.paymentDueDay ? String(card.paymentDueDay) : "");
	const [rule, setRule] = useState<PaymentRule>(card.paymentRule);
	const [fixed, setFixed] = useState(
		card.fixedPayment === null ? "" : centsToMajorUnits(card.fixedPayment),
	);
	const isFromBank = (field: string) =>
		account.source === "plaid" && !card.overriddenFields.includes(field);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		try {
			await update.mutateAsync({
				id: account.id,
				aprBps: percentTextToBps(apr),
				statementCloseDay: dayOrNull(closeDay),
				paymentDueDay: dayOrNull(dueDay),
				paymentRule: rule,
				fixedPayment: fixed.trim() === "" ? null : majorUnitsToCents(fixed),
			});
			toast.success("Card terms saved");
		} catch (_error) {
			toast.error("Could not save card terms");
		}
	}

	return (
		<form className="flex flex-col gap-3 text-sm" onSubmit={onSubmit} aria-label="Card terms">
			<div className="grid grid-cols-2 gap-3">
				<label className="flex flex-col gap-1" htmlFor="card-apr">
					APR (%)
					<input
						id="card-apr"
						className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						type="number"
						inputMode="decimal"
						min="0"
						step="0.01"
						value={apr}
						onChange={(event) => setApr(event.target.value)}
					/>
					{isFromBank("aprBps") && account.aprBps !== null ? (
						<span className="text-xs text-muted-foreground">from bank</span>
					) : null}
				</label>
				<div className="flex flex-col gap-1">
					<label htmlFor="card-rule">Payment rule</label>
					<Select value={rule} onValueChange={(next) => setRule(next as PaymentRule)}>
						<SelectTrigger id="card-rule">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PAYMENT_RULE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<label className="flex flex-col gap-1" htmlFor="card-close-day">
					Statement close day
					<input
						id="card-close-day"
						className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						type="number"
						min="1"
						max="31"
						value={closeDay}
						onChange={(event) => setCloseDay(event.target.value)}
					/>
				</label>
				<label className="flex flex-col gap-1" htmlFor="card-due-day">
					Payment due day
					<input
						id="card-due-day"
						className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						type="number"
						min="1"
						max="31"
						value={dueDay}
						onChange={(event) => setDueDay(event.target.value)}
					/>
				</label>
				{rule === "fixed" ? (
					<label className="flex flex-col gap-1" htmlFor="card-fixed">
						Fixed amount
						<input
							id="card-fixed"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							value={fixed}
							onChange={(event) => setFixed(event.target.value)}
						/>
					</label>
				) : null}
			</div>
			<button
				type="submit"
				disabled={update.isPending}
				className="self-start rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				Save card terms
			</button>
		</form>
	);
}
