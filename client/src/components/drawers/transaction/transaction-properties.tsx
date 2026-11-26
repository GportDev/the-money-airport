import { BetterCardBadge } from "@/components/transactions/better-card-badge";
import { CategorySelect } from "@/components/transactions/category-select";
import { MerchantCombobox } from "@/components/transactions/merchant-combobox";
import { CardInfo } from "@/components/ui/card";
import { InlineText } from "@/components/ui/inline-text";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { SelectField } from "@/components/ui/select-field";
import { useAccounts } from "@/hooks/use-accounts";
import { useSaveTransaction } from "@/hooks/use-save-transaction";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail };

/** One card of the Transaction's properties; each editable value saves as soon as it changes. */
export function TransactionProperties({ transaction }: Props) {
	const { save, saveOrThrow } = useSaveTransaction(transaction.id);
	// The ledger fields of a split part are fixed; unsplit to change them.
	const canEditLedger = transaction.isManual && !transaction.split;
	return (
		<PropertyList className="mx-4">
			<PropertyRow
				label={
					<>
						Category
						<CardInfo label="About categories">
							Pick a transfer category for money moving between your own accounts: it is left out of
							income and spending.
						</CardInfo>
					</>
				}
			>
				<CategorySelect
					transactionId={transaction.id}
					category={transaction.category}
					label="Category"
					className="-ml-1.5"
				/>
			</PropertyRow>
			<PropertyRow label="Merchant">
				{(labelId) => (
					<MerchantCombobox
						aria-labelledby={labelId}
						value={transaction.merchantName}
						onValueChange={(merchantName) => save({ merchantName })}
						className="-ml-2 h-8 w-full max-w-full rounded-lg px-2 transition-colors hover:bg-foreground/5 data-[popup-open]:bg-foreground/5"
					/>
				)}
			</PropertyRow>
			<PropertyRow label="Account">
				{canEditLedger ? (
					<AccountPicker transaction={transaction} />
				) : (
					<span className="truncate">{accountLabel(transaction)}</span>
				)}
			</PropertyRow>
			<PropertyRow label="Date">
				{canEditLedger ? (
					<InlineText
						aria-label="Date"
						type="date"
						value={transaction.date}
						onCommit={(date) => saveOrThrow({ date })}
						className="-ml-2"
					/>
				) : (
					<span>{transaction.date}</span>
				)}
			</PropertyRow>
			<PropertyRow label="Best card">
				{transaction.betterCard ? (
					<BetterCardBadge
						betterCard={transaction.betterCard}
						currency={transaction.isoCurrencyCode}
					/>
				) : (
					<span className="truncate">{transaction.account?.name ?? "—"}</span>
				)}
			</PropertyRow>
			{transaction.split ? (
				<PropertyRow label="Split">{`${transaction.split.parts.length} parts`}</PropertyRow>
			) : null}
			{transaction.fundEntry ? (
				<PropertyRow label="Fund">{transaction.fundEntry.goalName}</PropertyRow>
			) : null}
		</PropertyList>
	);
}

function AccountPicker({ transaction }: Props) {
	const accounts = useAccounts();
	const { save } = useSaveTransaction(transaction.id);
	return (
		<SelectField
			aria-label="Account"
			variant="ghost"
			className="-ml-2.5 w-full font-normal"
			value={transaction.account?.id ?? ""}
			options={[
				{ value: "", label: "No account" },
				...(accounts.data ?? []).map((account) => ({ value: account.id, label: account.name })),
			]}
			onValueChange={(id) => save({ bankAccountId: id === "" ? null : id })}
		/>
	);
}

function accountLabel(transaction: TransactionDetail) {
	if (!transaction.account) return "Manual · no account";
	const { name, mask } = transaction.account;
	return mask ? `${name} …${mask}` : name;
}
