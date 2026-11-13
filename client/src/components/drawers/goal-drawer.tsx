import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GoalFundingFields } from "@/components/goals/goal-funding-fields";
import { GoalIconFields } from "@/components/goals/goal-icon-fields";
import { Segmented } from "@/components/ui/segmented";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from "@/hooks/use-goals";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import { GOAL_TABS } from "@/lib/goals";
import type { Goal, GoalFunding, GoalType } from "@/types";

type Props = {
	/** null opens the create form. */
	goal: Goal | null;
	defaultType: GoalType;
	onClose: () => void;
};

export function GoalDrawer({ goal, defaultType, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const create = useCreateGoal();
	const update = useUpdateGoal();
	const remove = useDeleteGoal();
	const [name, setName] = useState(goal?.name ?? "");
	const [target, setTarget] = useState(goal ? centsToMajorUnits(goal.targetAmount) : "");
	const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
	const [icon, setIcon] = useState(goal?.icon ?? "piggy-bank");
	const [color, setColor] = useState(goal?.color ?? "#10B981");
	const [type, setType] = useState<GoalType>(goal?.type ?? defaultType);
	const [funding, setFunding] = useState<GoalFunding>(goal?.funding ?? "accounts");
	const [hostId, setHostId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const isBusy = create.isPending || update.isPending || remove.isPending;

	function validationError() {
		const cents = majorUnitsToCents(target);
		if (name.trim() === "") return "Enter a name.";
		if (!Number.isFinite(cents) || cents <= 0) return "Enter a target above 0.";
		if (!goal && type === "save_up" && funding === "fund" && !hostId) {
			return "Pick the account this Fund lives in.";
		}
		return null;
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const problem = validationError();
		setError(problem);
		if (problem) return;
		const fields = {
			name: name.trim(),
			targetAmount: majorUnitsToCents(target),
			targetDate: targetDate || null,
			icon,
			color,
		};
		try {
			if (goal) {
				await update.mutateAsync({ id: goal.id, ...fields });
				toast.success("Goal saved");
			} else {
				const isFund = type === "save_up" && funding === "fund";
				await create.mutateAsync({
					...fields,
					type,
					funding: isFund ? "fund" : "accounts",
					...(isFund ? { hostBankAccountId: hostId } : {}),
				});
				toast.success("Goal created");
			}
			close();
		} catch (_error) {
			toast.error("Could not save goal");
		}
	}

	async function onDelete() {
		if (!goal) return;
		setDeleteOpen(false);
		try {
			await remove.mutateAsync(goal.id);
			toast.success("Goal deleted");
			close();
		} catch (_error) {
			toast.error("Could not delete goal");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{goal ? goal.name : "New goal"}</SheetTitle>
					<SheetDescription>
						{goal ? "Edit this goal." : "Set a target to save up for or pay down."}
					</SheetDescription>
				</SheetHeader>
				<form id="goal-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					{goal ? null : (
						<Segmented
							aria-label="Goal type"
							value={type}
							options={GOAL_TABS}
							onValueChange={setType}
						/>
					)}
					<label className="flex flex-col gap-1 text-sm" htmlFor="goal-name">
						Name
						<input
							id="goal-name"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="goal-target">
						Target
						<input
							id="goal-target"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={target}
							onChange={(event) => setTarget(event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="goal-date">
						Target date
						<input
							id="goal-date"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="date"
							value={targetDate}
							onChange={(event) => setTargetDate(event.target.value)}
						/>
					</label>
					<GoalIconFields
						icon={icon}
						color={color}
						onIconChange={setIcon}
						onColorChange={setColor}
					/>
					{!goal && type === "save_up" ? (
						<GoalFundingFields
							funding={funding}
							hostId={hostId}
							onFundingChange={setFunding}
							onHostChange={setHostId}
						/>
					) : null}
					{error ? (
						<p role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
				</form>
				<SheetFooter>
					<button
						form="goal-form"
						type="submit"
						disabled={isBusy}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					>
						{goal ? "Save goal" : "Create goal"}
					</button>
					{goal ? (
						<button
							type="button"
							disabled={isBusy}
							onClick={() => setDeleteOpen(true)}
							className="rounded-md border border-border px-3 py-2 text-sm text-negative transition-colors hover:bg-negative/5 disabled:opacity-60"
						>
							Delete goal
						</button>
					) : null}
				</SheetFooter>
				{isDeleteOpen && goal ? (
					<ConfirmDialog
						title={`Delete ${goal.name}? Its Fund entries go too.`}
						onCancel={() => setDeleteOpen(false)}
						onConfirm={() => void onDelete()}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
