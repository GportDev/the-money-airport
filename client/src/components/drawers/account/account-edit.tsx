import { toast } from "sonner";
import { AccountFunds } from "@/components/accounts/account-funds";
import { AccountTransactions } from "@/components/accounts/account-transactions";
import { CreditSection } from "@/components/accounts/credit-section";
import { LoanSection } from "@/components/accounts/loan-section";
import { Sparkline } from "@/components/accounts/sparkline";
import {
	type AccountActionHandlers,
	AccountActions,
} from "@/components/drawers/account/account-actions";
import { Amount } from "@/components/ui/amount";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineText } from "@/components/ui/inline-text";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { bpsToPercent, earnsApy, percentToBps } from "@/lib/apy";
import { centsToMajorUnits, formatMoney, majorUnitsToCents } from "@/lib/format";
import type { BankAccount } from "@/types";

export type AccountSaveInput = {
	name: string;
	type: string;
	displayGroup: BankAccount["displayGroup"];
	currentBalance: number;
	isoCurrencyCode: string;
	/** Credit cards only; null elsewhere. */
	creditLimit: number | null;
	isHidden: boolean;
	apyBps: number | null;
	/** Cash BankAccounts only; undefined leaves it unchanged. */
	inCashPlan?: boolean;
	/** Liabilities only; undefined leaves it unchanged. */
	inDebtPlan?: boolean;
};

type Props = AccountActionHandlers & {
	account: BankAccount;
	range: string;
	onSave: (input: AccountSaveInput) => Promise<void>;
};

/** An existing BankAccount, edited in place: each value saves as soon as it changes. */
export function AccountEdit({ account, range, onSave, ...handlers }: Props) {
	const isCredit = account.displayGroup === "credit";
	const isLiability = isCredit || account.displayGroup === "loan";

	function saveOrThrow(patch: Partial<AccountSaveInput>) {
		return onSave({ ...currentInput(account), ...patch });
	}

	function save(patch: Partial<AccountSaveInput>) {
		saveOrThrow(patch).catch(() => toast.error(`Could not save ${account.name}`));
	}

	return (
		<>
			<SheetHeader className="gap-1 pr-12">
				<SheetTitle>
					<InlineText
						aria-label="Name"
						size="title"
						value={account.name}
						onCommit={(name) => saveOrThrow({ name })}
						className="-ml-2"
					/>
				</SheetTitle>
				<SheetDescription>
					{account.institutionName ?? "Manual account"}
					{account.mask ? ` · …${account.mask}` : ""}
				</SheetDescription>
			</SheetHeader>
			{account.sparkline.length > 1 ? (
				<div className="px-4 text-muted-foreground">
					<Sparkline points={account.sparkline} width={240} height={48} />
				</div>
			) : null}
			<PropertyList aria-label="Details" className="mx-4">
				<PropertyRow label="Balance">
					<InlineText
						aria-label="Balance"
						inputMode="decimal"
						value={centsToMajorUnits(account.currentBalance)}
						onCommit={(value) => saveOrThrow({ currentBalance: finiteCents(value) })}
						className="amount -ml-2"
					/>
				</PropertyRow>
				{account.availableBalance != null ? (
					<PropertyRow label="Available">
						<Amount>{formatMoney(account.availableBalance, account.isoCurrencyCode)}</Amount>
					</PropertyRow>
				) : null}
				{isCredit ? (
					<PropertyRow label="Credit limit">
						<InlineText
							aria-label="Credit limit"
							inputMode="decimal"
							allowEmpty
							value={account.creditLimit != null ? centsToMajorUnits(account.creditLimit) : ""}
							onCommit={(value) =>
								saveOrThrow({ creditLimit: value === "" ? null : finiteCents(value) })
							}
							className="amount -ml-2"
						/>
					</PropertyRow>
				) : null}
				{earnsApy(account) ? (
					<PropertyRow label="APY (%)">
						<InlineText
							aria-label="APY (%)"
							inputMode="decimal"
							placeholder="4.25"
							allowEmpty
							value={account.apyBps != null ? bpsToPercent(account.apyBps) : ""}
							onCommit={(value) =>
								saveOrThrow({ apyBps: value === "" ? null : percentToBps(value) })
							}
							className="-ml-2"
						/>
					</PropertyRow>
				) : null}
				{account.displayGroup === "cash" ? (
					<CheckboxRow
						label="In cash plan"
						hint="The Forecast pays bills from and receives income into cash plan accounts."
						checked={account.inCashPlan}
						onChange={(inCashPlan) => save({ inCashPlan })}
					/>
				) : null}
				{isLiability ? (
					<CheckboxRow
						label="In debt plan"
						hint="Payback pays down debt plan cards and loans."
						checked={account.inDebtPlan}
						onChange={(inDebtPlan) => save({ inDebtPlan })}
					/>
				) : null}
				<CheckboxRow
					label="Hidden"
					hint="Left out of net worth, Budget, and Goals."
					checked={account.isHidden}
					onChange={(isHidden) => save({ isHidden })}
				/>
			</PropertyList>
			<AccountActions account={account} {...handlers} />
			{account.funds.length > 0 ? <AccountFunds account={account} /> : null}
			{account.card ? <CreditSection account={account} card={account.card} /> : null}
			{account.displayGroup === "loan" ? <LoanSection account={account} /> : null}
			<AccountTransactions account={account} range={range} />
		</>
	);
}

function CheckboxRow({
	label,
	hint,
	checked,
	onChange,
}: {
	label: string;
	hint: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<PropertyRow label={label}>
			<span className="flex min-w-0 items-center gap-2">
				<Checkbox
					aria-label={label}
					checked={checked}
					onCheckedChange={(next) => onChange(next === true)}
				/>
				<span className="truncate text-xs text-muted-foreground">{hint}</span>
			</span>
		</PropertyRow>
	);
}

function currentInput(account: BankAccount): AccountSaveInput {
	return {
		name: account.name,
		type: account.type,
		displayGroup: account.displayGroup,
		currentBalance: account.currentBalance,
		isoCurrencyCode: account.isoCurrencyCode,
		creditLimit: account.creditLimit,
		isHidden: account.isHidden,
		apyBps: account.apyBps,
		inCashPlan: account.displayGroup === "cash" ? account.inCashPlan : undefined,
		inDebtPlan:
			account.displayGroup === "credit" || account.displayGroup === "loan"
				? account.inDebtPlan
				: undefined,
	};
}

function finiteCents(value: string) {
	const cents = majorUnitsToCents(value);
	if (!Number.isFinite(cents)) throw new Error("Enter an amount.");
	return cents;
}
