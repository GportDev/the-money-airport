import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";

/** Radix Select needs a non-empty value; this one stands for "Operating cash" (null). */
const OPERATING_CASH = "operating-cash";

type Props = {
	id: string;
	label: string;
	value: string | null;
	onChange: (bankAccountId: string | null) => void;
};

/** Operating cash by default, or a specific cash account or credit card. */
export function PayFromSelect({ id, label, value, onChange }: Props) {
	const accounts = useAccounts();
	const options = (accounts.data ?? []).filter(
		(account) =>
			!account.isHidden && (account.displayGroup === "cash" || account.displayGroup === "credit"),
	);
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label htmlFor={id}>{label}</label>
			<Select
				value={value ?? OPERATING_CASH}
				onValueChange={(next) => onChange(next === OPERATING_CASH ? null : next)}
			>
				<SelectTrigger id={id}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={OPERATING_CASH}>Operating cash</SelectItem>
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
