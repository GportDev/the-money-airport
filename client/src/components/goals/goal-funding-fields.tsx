import { Segmented } from "@/components/ui/segmented";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useGoals } from "@/hooks/use-goals";
import { hostableAccounts } from "@/lib/goals";
import type { GoalFunding } from "@/types";

const FUNDING_OPTIONS: { value: GoalFunding; label: string }[] = [
	{ value: "accounts", label: "Accounts" },
	{ value: "fund", label: "Fund" },
];

type Props = {
	funding: GoalFunding;
	hostId: string;
	onFundingChange: (funding: GoalFunding) => void;
	onHostChange: (hostId: string) => void;
};

/** Accounts funding tracks real balances; a Fund is a ledger inside one host account. */
export function GoalFundingFields({ funding, hostId, onFundingChange, onHostChange }: Props) {
	const accounts = useAccounts();
	const goals = useGoals();
	const hosts = hostableAccounts(accounts.data ?? [], goals.data?.goals ?? []);
	return (
		<div className="flex flex-col gap-2 text-sm">
			<span>Funding</span>
			<Segmented
				aria-label="Funding"
				value={funding}
				options={FUNDING_OPTIONS}
				onValueChange={onFundingChange}
			/>
			{funding === "fund" ? (
				<div className="flex flex-col gap-1">
					<label htmlFor="goal-host">Lives in</label>
					<Select value={hostId} onValueChange={onHostChange}>
						<SelectTrigger id="goal-host">
							<SelectValue placeholder="Pick an account" />
						</SelectTrigger>
						<SelectContent>
							{hosts.map((account) => (
								<SelectItem key={account.id} value={account.id}>
									{account.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hosts.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Add a visible savings account that is not on another goal first.
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
