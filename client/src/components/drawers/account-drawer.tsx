import { type FormEvent, useState } from "react";
import { type AccountActionHandlers } from "@/components/drawers/account/account-actions";
import { AccountEdit, type AccountSaveInput } from "@/components/drawers/account/account-edit";
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
import { majorUnitsToCents } from "@/lib/format";
import { type BankAccount, DISPLAY_GROUPS } from "@/types";

const TYPES = ["checking", "savings", "credit", "investment", "loan", "vehicle", "other"] as const;

type Props = AccountActionHandlers & {
	open: boolean;
	/** null opens the add form. */
	account: BankAccount | null;
	/** The Accounts page timeframe; the drawer lists Transactions inside it. */
	range?: string;
	onClose: () => void;
	onSave: (input: AccountSaveInput) => Promise<void>;
};

export function AccountDrawer({
	open,
	account,
	range = "1m",
	onClose,
	onSave,
	...handlers
}: Props) {
	const { sheet, close } = useSheetClose(onClose);
	return (
		<Sheet open={open && sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto pb-4">
				{account ? (
					<AccountEdit account={account} range={range} onSave={onSave} {...handlers} />
				) : (
					<AddAccountForm onSave={onSave} onDone={() => close()} />
				)}
			</SheetContent>
		</Sheet>
	);
}

/** A manual BankAccount: name, group, type, currency, balance, and a limit for cards. */
function AddAccountForm({
	onSave,
	onDone,
}: {
	onSave: (input: AccountSaveInput) => Promise<void>;
	onDone: () => void;
}) {
	const [name, setName] = useState("");
	const [type, setType] = useState("other");
	const [displayGroup, setDisplayGroup] = useState<BankAccount["displayGroup"]>("cash");
	const [balance, setBalance] = useState("0.00");
	const [currency, setCurrency] = useState("USD");
	const [creditLimit, setCreditLimit] = useState("");
	const isCreditLimitShown = displayGroup === "credit";

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
			isHidden: false,
			apyBps: null,
		});
		onDone();
	}

	return (
		<>
			<SheetHeader>
				<SheetTitle>Add account</SheetTitle>
				<SheetDescription>Add a manual BankAccount.</SheetDescription>
			</SheetHeader>
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
				<label className="flex flex-col gap-1 text-sm" htmlFor="account-balance">
					Balance
					<Input
						id="account-balance"
						inputMode="decimal"
						value={balance}
						onChange={(event) => setBalance(event.target.value)}
						required
					/>
				</label>
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
				<SheetFooter className="px-0">
					<Button type="submit">Save</Button>
				</SheetFooter>
			</form>
		</>
	);
}
