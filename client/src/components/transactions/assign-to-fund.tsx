import { useState } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateFundEntry } from "@/hooks/use-goals";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail };

/** On a Fund host, a Transaction can become a deposit or withdrawal on one of its Funds. */
export function AssignToFund({ transaction }: Props) {
	const accounts = useAccounts();
	const assign = useCreateFundEntry();
	const [goalId, setGoalId] = useState("");
	const host = accounts.data?.find((account) => account.id === transaction.account?.id);
	const funds = host?.funds ?? [];

	if (transaction.fundEntry) {
		return (
			<p className="px-4 text-sm text-muted-foreground">In {transaction.fundEntry.goalName}</p>
		);
	}
	if (funds.length === 0) {
		return null;
	}

	async function onAssign() {
		const fund = funds.find((row) => row.goalId === goalId);
		if (!fund) return;
		try {
			await assign.mutateAsync({ goalId: fund.goalId, transactionId: transaction.id });
			toast.success(`Assigned to ${fund.name}`);
		} catch (_error) {
			toast.error("Could not assign to Fund");
		}
	}

	return (
		<div className="flex items-end gap-2 px-4 text-sm">
			<div className="flex flex-1 flex-col gap-1">
				<label htmlFor="assign-fund">Assign to Fund</label>
				<Select value={goalId} onValueChange={setGoalId}>
					<SelectTrigger id="assign-fund">
						<SelectValue placeholder="Pick a Fund" />
					</SelectTrigger>
					<SelectContent>
						{funds.map((fund) => (
							<SelectItem key={fund.goalId} value={fund.goalId}>
								{fund.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<button
				type="button"
				disabled={!goalId || assign.isPending}
				onClick={() => void onAssign()}
				className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				{assign.isPending ? "Assigning…" : "Assign"}
			</button>
		</div>
	);
}
