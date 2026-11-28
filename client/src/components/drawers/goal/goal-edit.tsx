import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GoalIconFields } from "@/components/goals/goal-icon-fields";
import { Button } from "@/components/ui/button";
import { InlineText } from "@/components/ui/inline-text";
import { Progress } from "@/components/ui/progress";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDeleteGoal, useUpdateGoal } from "@/hooks/use-goals";
import { toEmoji } from "@/lib/emoji-icon";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import { formatPercent } from "@/lib/goals";
import type { Goal } from "@/types";

type Props = { goal: Goal; onDeleted: () => void };

const COLOR_SETTLE_MS = 400;

type GoalFields = Pick<Goal, "name" | "targetAmount" | "targetDate" | "icon" | "color">;

/** An existing goal, edited in place: name, target, date, and look each save on their own. */
export function GoalEdit({ goal, onDeleted }: Props) {
	const update = useUpdateGoal();
	const remove = useDeleteGoal();
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const [color, setColor] = useState(goal.color);

	function saveOrThrow(patch: Partial<GoalFields>) {
		return update.mutateAsync({
			id: goal.id,
			name: goal.name,
			targetAmount: goal.targetAmount,
			targetDate: goal.targetDate,
			icon: toEmoji(goal.icon),
			color: goal.color,
			...patch,
		});
	}

	function save(patch: Partial<GoalFields>) {
		saveOrThrow(patch).catch(() => toast.error("Could not save goal"));
	}

	// The color picker reports every drag step; save once it settles.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new color should save.
	useEffect(() => {
		if (color === goal.color) return;
		const timer = window.setTimeout(() => save({ color }), COLOR_SETTLE_MS);
		return () => window.clearTimeout(timer);
	}, [color]);

	async function onDelete() {
		setDeleteOpen(false);
		try {
			await remove.mutateAsync(goal.id);
			toast.success("Goal deleted");
			onDeleted();
		} catch (_error) {
			toast.error("Could not delete goal");
		}
	}

	return (
		<>
			<SheetHeader className="gap-1 pr-12">
				<SheetTitle>
					<InlineText
						aria-label="Name"
						size="title"
						value={goal.name}
						onCommit={(name) => saveOrThrow({ name })}
						className="-ml-2"
					/>
				</SheetTitle>
				<SheetDescription>{formatPercent(goal.percentComplete)} of the way there.</SheetDescription>
			</SheetHeader>
			<div className="px-4">
				<Progress
					value={Math.min(100, goal.percentComplete * 100)}
					aria-label={`${goal.name} progress`}
				/>
			</div>
			<PropertyList className="mx-4">
				<PropertyRow label="Target">
					<InlineText
						aria-label="Target"
						inputMode="decimal"
						value={centsToMajorUnits(goal.targetAmount)}
						onCommit={(value) => saveOrThrow({ targetAmount: positiveCents(value) })}
						className="amount -ml-2"
					/>
				</PropertyRow>
				<PropertyRow label="Target date">
					<InlineText
						aria-label="Target date"
						type="date"
						allowEmpty
						value={goal.targetDate ?? ""}
						onCommit={(value) => saveOrThrow({ targetDate: value === "" ? null : value })}
						className="-ml-2"
					/>
				</PropertyRow>
			</PropertyList>
			<div className="px-4">
				<GoalIconFields
					icon={toEmoji(goal.icon)}
					color={color}
					onIconChange={(icon) => save({ icon })}
					onColorChange={setColor}
				/>
			</div>
			<SheetFooter>
				<Button
					variant="danger-outline"
					type="button"
					disabled={remove.isPending}
					onClick={() => setDeleteOpen(true)}
				>
					Delete goal
				</Button>
			</SheetFooter>
			{isDeleteOpen ? (
				<ConfirmDialog
					title={`Delete ${goal.name}? Its Fund entries go too.`}
					onCancel={() => setDeleteOpen(false)}
					onConfirm={() => void onDelete()}
				/>
			) : null}
		</>
	);
}

function positiveCents(value: string) {
	const cents = majorUnitsToCents(value);
	if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter a target above 0.");
	return cents;
}
