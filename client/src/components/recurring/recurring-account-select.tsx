import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";

/** Radix Select needs a non-empty value; this one stands for "no BankAccount" (null). */
const NO_ACCOUNT = "no-account";

type Props = { value: string | null; onChange: (bankAccountId: string | null) => void };

export function RecurringAccountSelect({ value, onChange }: Props) {
	const accounts = useAccounts();
	const options = (accounts.data ?? []).filter((account) => !account.isHidden);
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label htmlFor="recurring-account">Paid from</label>
			<Select
				value={value ?? NO_ACCOUNT}
				onValueChange={(next) => onChange(next === NO_ACCOUNT ? null : next)}
			>
				<SelectTrigger id="recurring-account">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NO_ACCOUNT}>Any account</SelectItem>
					{options.map((account) => (
						<SelectItem key={account.id} value={account.id}>
							{account.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
