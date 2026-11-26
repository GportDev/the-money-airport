import { type FormEvent, useState } from "react";
import { reconnectItem } from "@/api/plaid";
import { AccountFunds } from "@/components/accounts/account-funds";
import { AccountTransactions } from "@/components/accounts/account-transactions";
import { ApyField } from "@/components/accounts/apy-field";
import { CashPlanToggle } from "@/components/accounts/cash-plan-toggle";
import { ConnectPlaidButton } from "@/components/accounts/connect-plaid-button";
import { CreditSection } from "@/components/accounts/credit-section";
import { DebtPlanToggle } from "@/components/accounts/debt-plan-toggle";
import { LoanSection } from "@/components/accounts/loan-section";
import { Sparkline } from "@/components/accounts/sparkline";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { bpsToPercent, earnsApy, percentToBps } from "@/lib/apy";
import { centsToMajorUnits, formatMoney, majorUnitsToCents } from "@/lib/format";
import { type BankAccount, DISPLAY_GROUPS } from "@/types";

const TYPES = ["checking", "savings", "credit", "investment", "loan", "vehicle", "other"] as const;

export function AccountDrawer({
	open,
	account,
	range = "1m",
	onClose,
	onSave,
	onDelete,
	onDisconnect,
	onReconnected,
}: {
	open: boolean;
	account: BankAccount | null;
	/** The Accounts page timeframe; the drawer lists Transactions inside it. */
	range?: string;
	onClose: () => void;
	onSave: (input: {
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
	}) => Promise<void>;
	onDelete?: () => void;
	onDisconnect?: () => void;
	onReconnected?: () => void;
}) {
	const isEdit = Boolean(account);
	const { sheet, close } = useSheetClose(onClose);
	const [name, setName] = useState(account?.name ?? "");
	const [type, setType] = useState(account?.type ?? "other");
	const [displayGroup, setDisplayGroup] = useState<BankAccount["displayGroup"]>(
		account?.displayGroup ?? "cash",
	);
	const [balance, setBalance] = useState(
		account ? centsToMajorUnits(account.currentBalance) : "0.00",
	);
	const [currency, setCurrency] = useState(account?.isoCurrencyCode ?? "USD");
	const [creditLimit, setCreditLimit] = useState(
		account?.creditLimit != null ? centsToMajorUnits(account.creditLimit) : "",
	);
	const [hidden, setHidden] = useState(account?.isHidden ?? false);
	const [apy, setApy] = useState(account?.apyBps != null ? bpsToPercent(account.apyBps) : "");
	const isApyShown = isEdit && account !== null && earnsApy(account);
	const isCashPlanShown = isEdit && account?.displayGroup === "cash";
	const [inCashPlan, setInCashPlan] = useState(account?.inCashPlan ?? false);
	const isCreditLimitShown = (account?.displayGroup ?? displayGroup) === "credit";
	const isDebtPlanShown =
		isEdit && (account?.displayGroup === "credit" || account?.displayGroup === "loan");
	const [inDebtPlan, setInDebtPlan] = useState(account?.inDebtPlan ?? true);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		await onSave({
			name,
			type,
			displayGroup,
			currentBalance: majorUnitsToCents(balance),
			isoCurrencyCode: currency.toUpperCase(),
			creditLimit:
				!isCreditLimitShown || creditLimit === "" ? null : majorUnitsToCents(creditLimit),
			isHidden: hidden,
			apyBps: apy.trim() === "" ? null : percentToBps(apy),
			inCashPlan: isCashPlanShown ? inCashPlan : undefined,
			inDebtPlan: isDebtPlanShown ? inDebtPlan : undefined,
		});
		close();
	}

	return (
		<Sheet open={open && sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{isEdit ? account?.name : "Add account"}</SheetTitle>
					<SheetDescription>
						{isEdit ? "Edit this BankAccount." : "Add a manual BankAccount."}
					</SheetDescription>
				</SheetHeader>
				{isEdit && account && account.sparkline.length > 1 ? (
					<div className="px-4">
						<Sparkline points={account.sparkline} width={240} height={48} />
					</div>
				) : null}
				<form className="flex flex-col gap-3 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="account-name">
						Name
						<Input
							id="account-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
						/>
					</label>
					{isEdit ? null : (
						<>
							<div className="flex flex-col gap-1 text-sm">
								<label htmlFor="account-group">Display group</label>
								<SelectField
									id="account-group"
									value={displayGroup}
									options={DISPLAY_GROUPS.map((group) => ({
										value: group.key,
										label: group.label,
									}))}
									onValueChange={setDisplayGroup}
								/>
							</div>
							<div className="flex flex-col gap-1 text-sm">
								<label htmlFor="account-type">Type</label>
								<SelectField
									id="account-type"
									value={type}
									options={TYPES.map((item) => ({ value: item, label: item }))}
									onValueChange={setType}
								/>
							</div>
							<label className="flex flex-col gap-1 text-sm" htmlFor="account-currency">
								Currency
								<Input
									id="account-currency"
									value={currency}
									onChange={(event) => setCurrency(event.target.value)}
									required
								/>
							</label>
						</>
					)}
					<label className="flex flex-col gap-1 text-sm" htmlFor="account-balance">
						Balance
						<Input
							id="account-balance"
							value={balance}
							onChange={(event) => setBalance(event.target.value)}
							required
						/>
					</label>
					{isEdit && account?.availableBalance != null ? (
						<p className="text-sm text-muted-foreground">
							Available{" "}
							<Amount>{formatMoney(account.availableBalance, account.isoCurrencyCode)}</Amount>
						</p>
					) : null}
					{isCreditLimitShown ? (
						<label className="flex flex-col gap-1 text-sm" htmlFor="account-limit">
							Credit limit
							<Input
								id="account-limit"
								value={creditLimit}
								onChange={(event) => setCreditLimit(event.target.value)}
							/>
						</label>
					) : null}
					{isApyShown ? <ApyField value={apy} onChange={setApy} /> : null}
					{isCashPlanShown ? (
						<CashPlanToggle checked={inCashPlan} onCheckedChange={setInCashPlan} />
					) : null}
					{isDebtPlanShown ? (
						<DebtPlanToggle checked={inDebtPlan} onCheckedChange={setInDebtPlan} />
					) : null}
					{isEdit ? (
						<label className="flex items-center gap-2 text-sm" htmlFor="account-hidden">
							<input
								id="account-hidden"
								type="checkbox"
								checked={hidden}
								onChange={(event) => setHidden(event.target.checked)}
							/>
							Hidden
						</label>
					) : null}
					<SheetFooter>
						<Button type="submit">Save</Button>
						{isEdit && account?.source === "manual" && onDelete ? (
							<Button variant="danger-outline" type="button" onClick={onDelete}>
								Delete
							</Button>
						) : null}
						{isEdit && account?.source === "plaid" && onDisconnect ? (
							<Button variant="danger-outline" type="button" onClick={onDisconnect}>
								Disconnect
							</Button>
						) : null}
						{isEdit &&
						account?.plaidItemId &&
						account.plaidItemStatus === "disconnected" &&
						onReconnected ? (
							<Button
								variant="outline"
								type="button"
								onClick={() => {
									if (!account.plaidItemId) {
										return;
									}
									void reconnectItem(account.plaidItemId).then(onReconnected);
								}}
							>
								Reconnect
							</Button>
						) : null}
						{isEdit && account?.plaidItemId && account.errorCode === "ITEM_LOGIN_REQUIRED" ? (
							<ConnectPlaidButton
								itemId={account.plaidItemId}
								label="Reconnect with Plaid"
								onDone={() => onReconnected?.()}
							/>
						) : null}
					</SheetFooter>
				</form>
				{account && account.funds.length > 0 ? <AccountFunds account={account} /> : null}
				{account?.card ? <CreditSection account={account} card={account.card} /> : null}
				{account?.displayGroup === "loan" ? <LoanSection account={account} /> : null}
				{account ? <AccountTransactions account={account} range={range} /> : null}
			</SheetContent>
		</Sheet>
	);
}
