import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RecurringFields } from "@/components/recurring/recurring-fields";
import { RecurringSchedule } from "@/components/recurring/recurring-schedule";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useDeleteRecurring, useUpdateRecurring } from "@/hooks/use-recurring";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import { cadenceLabel, draftError, type RecurringDraft } from "@/lib/recurring";
import type { RecurringListItem } from "@/types";

type Props = { item: RecurringListItem; onClose: () => void };

export function RecurringDrawer({ item, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const update = useUpdateRecurring();
	const remove = useDeleteRecurring();
	const [draft, setDraft] = useState<RecurringDraft>({
		amount: centsToMajorUnits(item.amount),
		cadence: item.cadence,
		nextDate: item.nextDate,
	});
	const [isActive, setIsActive] = useState(item.isActive);
	const [error, setError] = useState<string | null>(null);
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const isBusy = update.isPending || remove.isPending;

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const amount = majorUnitsToCents(draft.amount);
		const problem = draftError(draft, amount);
		setError(problem);
		if (problem) return;
		try {
			await update.mutateAsync({
				id: item.id,
				amount,
				cadence: draft.cadence,
				nextDate: draft.nextDate,
				isActive,
			});
			toast.success(`${item.merchantName} saved`);
			close();
		} catch (_error) {
			toast.error(`Could not save ${item.merchantName}`);
		}
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
				<SheetHeader>
					<SheetTitle>{item.merchantName}</SheetTitle>
					<SheetDescription>
						{cadenceLabel(item.cadence)}
						{item.account ? ` from ${item.account.name}` : ""}
					</SheetDescription>
				</SheetHeader>
				{item.isActive ? <RecurringSchedule item={item} onDone={() => close()} /> : null}
				<form id="recurring-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<RecurringFields draft={draft} onChange={setDraft} error={error} />
					<label className="flex items-center gap-2 text-sm" htmlFor="recurring-active">
						<Checkbox
							id="recurring-active"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(checked === true)}
						/>
						Active
					</label>
				</form>
				<SheetFooter>
					<button
						form="recurring-form"
						type="submit"
						disabled={isBusy}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					>
						{update.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						disabled={isBusy}
						onClick={() => setDeleteOpen(true)}
						className="rounded-md border border-border px-3 py-2 text-sm text-negative transition-colors hover:bg-negative/5 disabled:opacity-60"
					>
						{remove.isPending ? "Deleting…" : "Delete"}
					</button>
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
