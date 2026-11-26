import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type Props = { transaction: TransactionDetail; onClose: () => void };

/** The Funds a Transaction could join: those on its host account, unless it is already in one. */
export function useAssignableFunds(transaction: TransactionDetail) {
	const accounts = useAccounts();
	if (transaction.fundEntry) return [];
	const host = accounts.data?.find((account) => account.id === transaction.account?.id);
	return host?.funds ?? [];
}

/** Drawer panel: make this Transaction a deposit or withdrawal on one of its host's Funds. */
export function AssignToFund({ transaction, onClose }: Props) {
	const assign = useCreateFundEntry();
	const [goalId, setGoalId] = useState("");
	const funds = useAssignableFunds(transaction);

	async function onAssign() {
		const fund = funds.find((row) => row.goalId === goalId);
		if (!fund) return;
		try {
			await assign.mutateAsync({ goalId: fund.goalId, transactionId: transaction.id });
			toast.success(`Assigned to ${fund.name}`);
			onClose();
		} catch (_error) {
			toast.error("Could not assign to Fund");
		}
	}

	return (
		<div className="flex items-end gap-2 rounded-xl bg-foreground/[0.03] p-3 text-sm">
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
			<Button
				variant="outline"
				type="button"
				disabled={!goalId || assign.isPending}
				onClick={() => void onAssign()}
			>
				{assign.isPending ? "Assigning…" : "Assign"}
			</Button>
		</div>
	);
}
