import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { RecurringAccountSelect } from "@/components/recurring/recurring-account-select";
import { RecurringFields } from "@/components/recurring/recurring-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useCreateRecurring } from "@/hooks/use-recurring";
import { majorUnitsToCents, todayIso } from "@/lib/format";
import { draftError, type RecurringDraft } from "@/lib/recurring";

export function AddRecurringDrawer({ onClose }: { onClose: () => void }) {
	const { sheet, close } = useSheetClose(onClose);
	const create = useCreateRecurring();
	const [merchantName, setMerchantName] = useState("");
	const [bankAccountId, setBankAccountId] = useState<string | null>(null);
	const [draft, setDraft] = useState<RecurringDraft>({
		amount: "",
		cadence: "monthly",
		nextDate: todayIso(),
	});
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const amount = majorUnitsToCents(draft.amount);
		const problem = merchantName.trim() === "" ? "Enter a name." : draftError(draft, amount);
		setError(problem);
		if (problem) return;
		try {
			await create.mutateAsync({
				merchantName: merchantName.trim(),
				amount,
				cadence: draft.cadence,
				nextDate: draft.nextDate,
				bankAccountId,
			});
			toast.success(`${merchantName.trim()} added`);
			close();
		} catch (_error) {
			toast.error("Could not add recurring item");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add recurring</SheetTitle>
					<SheetDescription>A bill or subscription you pay on a schedule.</SheetDescription>
				</SheetHeader>
				<form id="add-recurring-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="recurring-name">
						Name
						<Input
							id="recurring-name"
							value={merchantName}
							maxLength={200}
							onChange={(event) => setMerchantName(event.target.value)}
						/>
					</label>
					<RecurringFields draft={draft} onChange={setDraft} error={error} />
					<RecurringAccountSelect value={bankAccountId} onChange={setBankAccountId} />
				</form>
				<SheetFooter>
					<Button form="add-recurring-form" type="submit" disabled={create.isPending}>
						{create.isPending ? "Adding…" : "Add"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
