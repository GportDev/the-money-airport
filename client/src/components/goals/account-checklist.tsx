import { Amount } from "@/components/ui/amount";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/format";
import type { BankAccount, Goal } from "@/types";

type Props = {
	accounts: BankAccount[];
	chosen: string[];
	/** Goal each BankAccount is on now. */
	owners: Map<string, Goal>;
	currentGoalId: string;
	onToggle: (accountId: string, isChecked: boolean) => void;
};

export function AccountChecklist({ accounts, chosen, owners, currentGoalId, onToggle }: Props) {
	if (accounts.length === 0) {
		return <p className="text-sm text-muted-foreground">No accounts can join this goal.</p>;
	}
	return (
		<ul className="flex flex-col text-sm">
			{accounts.map((account) => {
				const owner = owners.get(account.id);
				const inputId = `goal-account-${account.id}`;
				return (
					<li key={account.id} className="flex items-center gap-3 border-b border-border py-2">
						<Checkbox
							id={inputId}
							checked={chosen.includes(account.id)}
							onCheckedChange={(state) => onToggle(account.id, state === true)}
						/>
						<label htmlFor={inputId} className="flex min-w-0 flex-1 flex-col">
							<span className="truncate">{account.name}</span>
							{owner && owner.id !== currentGoalId ? (
								<span className="text-xs text-muted-foreground">On {owner.name}</span>
							) : null}
						</label>
						<Amount>{formatMoney(account.currentBalance, account.isoCurrencyCode)}</Amount>
					</li>
				);
			})}
		</ul>
	);
}
