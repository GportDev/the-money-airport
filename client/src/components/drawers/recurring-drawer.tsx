import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RecurringSchedule } from "@/components/recurring/recurring-schedule";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineText } from "@/components/ui/inline-text";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
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
import { useOptimisticValue } from "@/hooks/use-optimistic-value";
import { useDeleteRecurring, useUpdateRecurring } from "@/hooks/use-recurring";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import { CADENCE_OPTIONS, cadenceLabel } from "@/lib/recurring";
import type { RecurringListItem } from "@/types";

type Props = { item: RecurringListItem; onClose: () => void };

type RecurringPatch = Partial<
	Pick<RecurringListItem, "amount" | "cadence" | "nextDate" | "isActive">
>;

/** A bill or subscription, edited in place: every value saves as soon as it changes. */
export function RecurringDrawer({ item, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const update = useUpdateRecurring();
	const remove = useDeleteRecurring();
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const active = useOptimisticValue(item.isActive);
	const cadence = useOptimisticValue(item.cadence);

	function saveOrThrow(patch: RecurringPatch) {
		return update.mutateAsync({ id: item.id, ...patch });
	}

	function save(patch: RecurringPatch, revert: () => void) {
		update.mutate(
			{ id: item.id, ...patch },
			{
				onError: () => {
					revert();
					toast.error(`Could not save ${item.merchantName}`);
				},
			},
		);
	}

	async function onDelete() {
		setDeleteOpen(false);
		try {
			await remove.mutateAsync(item.id);
			toast.success(`${item.merchantName} deleted`);
			close();
		} catch (_error) {
			toast.error(`Could not delete ${item.merchantName}`);
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader className="pr-12">
					<SheetTitle className="text-xl tracking-tight">{item.merchantName}</SheetTitle>
					<SheetDescription>
						{cadenceLabel(item.cadence)}
						{item.account ? ` from ${item.account.name}` : ""}
					</SheetDescription>
				</SheetHeader>
				{item.isActive ? <RecurringSchedule item={item} onDone={() => close()} /> : null}
				<PropertyList className="mx-4">
					<PropertyRow label="Amount">
						<InlineText
							aria-label="Amount"
							inputMode="decimal"
							value={centsToMajorUnits(item.amount)}
							onCommit={(value) => saveOrThrow({ amount: positiveCents(value) })}
							className="-ml-2 amount"
						/>
					</PropertyRow>
					<PropertyRow label="Cadence">
						<Segmented
							aria-label="Cadence"
							size="sm"
							value={cadence.value}
							options={CADENCE_OPTIONS}
							onValueChange={(next) => {
								cadence.setValue(next);
								save({ cadence: next }, cadence.revert);
							}}
						/>
					</PropertyRow>
					<PropertyRow label="Next date">
						<InlineText
							aria-label="Next date"
							type="date"
							value={item.nextDate}
							onCommit={(nextDate) => saveOrThrow({ nextDate })}
							className="-ml-2"
						/>
					</PropertyRow>
					<PropertyRow label="Active">
						<Checkbox
							aria-label="Active"
							checked={active.value}
							onCheckedChange={(checked) => {
								active.setValue(checked === true);
								save({ isActive: checked === true }, active.revert);
							}}
						/>
					</PropertyRow>
				</PropertyList>
				<SheetFooter>
					<Button
						variant="danger-outline"
						type="button"
						disabled={remove.isPending}
						onClick={() => setDeleteOpen(true)}
					>
						{remove.isPending ? "Deleting…" : "Delete"}
					</Button>
				</SheetFooter>
				{isDeleteOpen ? (
					<ConfirmDialog
						title={`Delete ${item.merchantName}? Transactions stay as they are.`}
						onCancel={() => setDeleteOpen(false)}
						onConfirm={() => void onDelete()}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

/** Recurring amounts are positive cents; anything else is rejected before it reaches the API. */
function positiveCents(value: string) {
	const cents = majorUnitsToCents(value);
	if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter an amount above 0.");
	return cents;
}
