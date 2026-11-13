import { useState } from "react";
import { toast } from "sonner";
import { AccountChecklist } from "@/components/goals/account-checklist";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useGoals, useSetGoalAccounts } from "@/hooks/use-goals";
import { associableAccounts, goalByAccount } from "@/lib/goals";
import type { Goal, GoalType } from "@/types";

type Props = {
	type: GoalType;
	onClose: () => void;
};

/** Picks which BankAccounts back one Goal. An account on another Goal moves over. */
export function EditAccountsDrawer({ type, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const accounts = useAccounts();
	const allGoals = useGoals();
	const save = useSetGoalAccounts();
	const goals = (allGoals.data?.goals ?? []).filter(
		(goal) => goal.type === type && goal.funding === "accounts",
	);
	const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
	const goal = goals.find((row) => row.id === goalId);
	const [selected, setSelected] = useState<string[] | null>(null);
	const chosen = selected ?? goal?.accounts.map((account) => account.id) ?? [];
	const owners = goalByAccount(allGoals.data?.goals ?? []);
	const options = associableAccounts(type, accounts.data ?? []);

	function onGoalChange(next: string) {
		setGoalId(next);
		setSelected(null);
	}

	function onToggle(accountId: string, isChecked: boolean) {
		if (type === "pay_down") {
			setSelected(isChecked ? [accountId] : []);
			return;
		}
		setSelected(isChecked ? [...chosen, accountId] : chosen.filter((id) => id !== accountId));
	}

	async function onSave() {
		if (!goal) return;
		try {
			await save.mutateAsync({ id: goal.id, bankAccountIds: chosen });
			toast.success("Accounts saved");
			for (const message of movedMessages(goal, chosen, owners)) {
				toast.info(message);
			}
			close();
		} catch (_error) {
			toast.error("Could not save accounts");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Edit accounts</SheetTitle>
					<SheetDescription>
						{type === "save_up"
							? "Goal progress is the balance of these accounts."
							: "Pick the one liability this goal pays down."}
					</SheetDescription>
				</SheetHeader>
				{goals.length === 0 ? (
					<p className="px-4 text-sm text-muted-foreground">Add a goal funded by accounts first.</p>
				) : (
					<div className="flex flex-col gap-4 px-4">
						<div className="flex flex-col gap-1 text-sm">
							<label htmlFor="edit-accounts-goal">Goal</label>
							<Select value={goalId} onValueChange={onGoalChange}>
								<SelectTrigger id="edit-accounts-goal">
									<SelectValue placeholder="Pick a goal" />
								</SelectTrigger>
								<SelectContent>
									{goals.map((row) => (
										<SelectItem key={row.id} value={row.id}>
											{row.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<AccountChecklist
							accounts={options}
							chosen={chosen}
							owners={owners}
							currentGoalId={goalId}
							onToggle={onToggle}
						/>
					</div>
				)}
				<SheetFooter>
					<button
						type="button"
						disabled={!goal || save.isPending}
						onClick={() => void onSave()}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					>
						{save.isPending ? "Saving…" : "Save accounts"}
					</button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function movedMessages(goal: Goal, chosen: string[], owners: Map<string, Goal>) {
	return chosen.flatMap((accountId) => {
		const previous = owners.get(accountId);
		if (!previous || previous.id === goal.id) return [];
		const account = previous.accounts.find((row) => row.id === accountId);
		return [`Moved ${account?.name ?? "account"} off ${previous.name}`];
	});
}
