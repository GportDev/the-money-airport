import { type FormEvent, useState } from "react";
import { reconnectItem } from "../../api/plaid";
import { centsToMajorUnits, formatMoney, majorUnitsToCents } from "../../lib/format";
import { type BankAccount, DISPLAY_GROUPS } from "../../types";
import { ConnectPlaidButton } from "../accounts/connect-plaid-button";
import { Sparkline } from "../accounts/sparkline";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "../ui/sheet";

const TYPES = ["checking", "savings", "credit", "investment", "loan", "vehicle", "other"] as const;

export function AccountDrawer({
	open,
	account,
	onClose,
	onSave,
	onDelete,
	onDisconnect,
	onReconnected,
}: {
	open: boolean;
	account: BankAccount | null;
	onClose: () => void;
	onSave: (input: {
		name: string;
		type: string;
		displayGroup: BankAccount["displayGroup"];
		currentBalance: number;
		isoCurrencyCode: string;
		creditLimit: number | null;
		isHidden: boolean;
	}) => Promise<void>;
	onDelete?: () => void;
	onDisconnect?: () => void;
	onReconnected?: () => void;
}) {
	const isEdit = Boolean(account);
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

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		await onSave({
			name,
			type,
			displayGroup,
			currentBalance: majorUnitsToCents(balance),
			isoCurrencyCode: currency.toUpperCase(),
			creditLimit: creditLimit === "" ? null : majorUnitsToCents(creditLimit),
			isHidden: hidden,
		});
	}

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent side="right" className="overflow-y-auto">
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
						<input
							id="account-name"
							className="rounded-md border border-border bg-card px-3 py-2"
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
						/>
					</label>
					{isEdit ? null : (
						<>
							<label className="flex flex-col gap-1 text-sm" htmlFor="account-group">
								Display group
								<select
									id="account-group"
									className="rounded-md border border-border bg-card px-3 py-2"
									value={displayGroup}
									onChange={(event) =>
										setDisplayGroup(event.target.value as BankAccount["displayGroup"])
									}
								>
									{DISPLAY_GROUPS.map((group) => (
										<option key={group.key} value={group.key}>
											{group.label}
										</option>
									))}
								</select>
							</label>
							<label className="flex flex-col gap-1 text-sm" htmlFor="account-type">
								Type
								<select
									id="account-type"
									className="rounded-md border border-border bg-card px-3 py-2"
									value={type}
									onChange={(event) => setType(event.target.value)}
								>
									{TYPES.map((item) => (
										<option key={item} value={item}>
											{item}
										</option>
									))}
								</select>
							</label>
							<label className="flex flex-col gap-1 text-sm" htmlFor="account-currency">
								Currency
								<input
									id="account-currency"
									className="rounded-md border border-border bg-card px-3 py-2"
									value={currency}
									onChange={(event) => setCurrency(event.target.value)}
									required
								/>
							</label>
						</>
					)}
					<label className="flex flex-col gap-1 text-sm" htmlFor="account-balance">
						Balance
						<input
							id="account-balance"
							className="rounded-md border border-border bg-card px-3 py-2"
							value={balance}
							onChange={(event) => setBalance(event.target.value)}
							required
						/>
					</label>
					{isEdit && account?.availableBalance != null ? (
						<p className="text-sm text-muted-foreground">
							Available {formatMoney(account.availableBalance, account.isoCurrencyCode)}
						</p>
					) : null}
					<label className="flex flex-col gap-1 text-sm" htmlFor="account-limit">
						Credit limit
						<input
							id="account-limit"
							className="rounded-md border border-border bg-card px-3 py-2"
							value={creditLimit}
							onChange={(event) => setCreditLimit(event.target.value)}
						/>
					</label>
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
						<button
							className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
							type="submit"
						>
							Save
						</button>
						{isEdit && account?.source === "manual" && onDelete ? (
							<button
								className="rounded-md border border-negative px-3 py-2 text-sm text-negative"
								type="button"
								onClick={onDelete}
							>
								Delete
							</button>
						) : null}
						{isEdit && account?.source === "plaid" && onDisconnect ? (
							<button
								className="rounded-md border border-negative px-3 py-2 text-sm text-negative"
								type="button"
								onClick={onDisconnect}
							>
								Disconnect
							</button>
						) : null}
						{isEdit &&
						account?.plaidItemId &&
						account.plaidItemStatus === "disconnected" &&
						onReconnected ? (
							<button
								className="rounded-md border border-border px-3 py-2 text-sm"
								type="button"
								onClick={() => {
									if (!account.plaidItemId) {
										return;
									}
									void reconnectItem(account.plaidItemId).then(onReconnected);
								}}
							>
								Reconnect
							</button>
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
			</SheetContent>
		</Sheet>
	);
}
