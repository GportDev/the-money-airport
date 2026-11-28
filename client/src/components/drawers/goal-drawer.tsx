import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { GoalEdit } from "@/components/drawers/goal/goal-edit";
import { GoalFundingFields } from "@/components/goals/goal-funding-fields";
import { GoalIconFields } from "@/components/goals/goal-icon-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCreateGoal } from "@/hooks/use-goals";
import { DEFAULT_GOAL_EMOJI } from "@/lib/emoji-icon";
import { majorUnitsToCents } from "@/lib/format";
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
	const [name, setName] = useState("");
	const [target, setTarget] = useState("");
	const [targetDate, setTargetDate] = useState("");
	const [icon, setIcon] = useState(DEFAULT_GOAL_EMOJI);
	const [color, setColor] = useState("#10B981");
	const [type, setType] = useState<GoalType>(defaultType);
	const [funding, setFunding] = useState<GoalFunding>("accounts");
	const [hostId, setHostId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const isBusy = create.isPending;

	function validationError() {
		const cents = majorUnitsToCents(target);
		if (name.trim() === "") return "Enter a name.";
		if (!Number.isFinite(cents) || cents <= 0) return "Enter a target above 0.";
		if (type === "save_up" && funding === "fund" && !hostId) {
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
			const isFund = type === "save_up" && funding === "fund";
			await create.mutateAsync({
				...fields,
				type,
				funding: isFund ? "fund" : "accounts",
				...(isFund ? { hostBankAccountId: hostId } : {}),
			});
			toast.success("Goal created");
			close();
		} catch (_error) {
			toast.error("Could not save goal");
		}
	}

	if (goal) {
		return (
			<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
				<SheetContent className="overflow-y-auto">
					<GoalEdit goal={goal} onDeleted={() => close()} />
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>New goal</SheetTitle>
					<SheetDescription>Set a target to save up for or pay down.</SheetDescription>
				</SheetHeader>
				<form id="goal-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<Segmented
						aria-label="Goal type"
						value={type}
						options={GOAL_TABS}
						onValueChange={setType}
					/>
					<label className="flex flex-col gap-1 text-sm" htmlFor="goal-name">
						Name
						<Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} />
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="goal-target">
						Target
						<Input
							id="goal-target"
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
						<Input
							id="goal-date"
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
					{type === "save_up" ? (
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
					<Button form="goal-form" type="submit" disabled={isBusy}>
						Create goal
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
