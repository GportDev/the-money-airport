import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FundSelect } from "@/components/forecast/fund-select";
import { PayFromSelect } from "@/components/forecast/pay-from-select";
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
import { useCreateOneOff, useDeleteOneOff, useUpdateOneOff } from "@/hooks/use-forecast";
import { isInflowSection, ONE_OFF_STATUS_LABELS } from "@/lib/forecast";
import { centsToMajorUnits, majorUnitsToCents, todayIso } from "@/lib/format";
import type { ForecastSection, OneOff, OneOffStatus } from "@/types";

const STATUS_OPTIONS = (Object.keys(ONE_OFF_STATUS_LABELS) as OneOffStatus[]).map((value) => ({
	value,
	label: ONE_OFF_STATUS_LABELS[value],
}));

type Props = {
	section: ForecastSection;
	/** null opens the create form. */
	oneOff: OneOff | null;
	onClose: () => void;
};

export function OneOffDrawer({ section, oneOff, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const create = useCreateOneOff();
	const update = useUpdateOneOff();
	const remove = useDeleteOneOff();
	const [name, setName] = useState(oneOff?.name ?? "");
	const [date, setDate] = useState(oneOff?.date ?? todayIso());
	const [amount, setAmount] = useState(oneOff ? centsToMajorUnits(Math.abs(oneOff.amount)) : "");
	const [bankAccountId, setBankAccountId] = useState(oneOff?.bankAccountId ?? null);
	const [goalId, setGoalId] = useState(oneOff?.goalId ?? null);
	const [status, setStatus] = useState<OneOffStatus>(oneOff?.status ?? "expected");
	const [error, setError] = useState<string | null>(null);
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const isInflow = isInflowSection(section.type);
	const isBusy = create.isPending || update.isPending || remove.isPending;

	function validationError() {
		const cents = majorUnitsToCents(amount);
		if (name.trim() === "") return "Enter a name.";
		if (!Number.isFinite(cents) || cents <= 0) return "Enter an amount above 0.";
		if (date === "") return "Pick a date.";
		return null;
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const problem = validationError();
		setError(problem);
		if (problem) return;
		const cents = majorUnitsToCents(amount);
		const fields = {
			name: name.trim(),
			date,
			amount: isInflow ? cents : -cents,
			bankAccountId,
			goalId,
		};
		try {
			if (oneOff) await update.mutateAsync({ id: oneOff.id, ...fields, status });
			else await create.mutateAsync({ sectionId: section.id, ...fields });
			toast.success("One-off saved");
			close();
		} catch (_error) {
			toast.error("Could not save one-off");
		}
	}

	async function onDelete() {
		if (!oneOff) return;
		setDeleteOpen(false);
		try {
			await remove.mutateAsync(oneOff.id);
			toast.success("One-off deleted");
			close();
		} catch (_error) {
			toast.error("Could not delete one-off");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{oneOff ? oneOff.name : "New one-off"}</SheetTitle>
					<SheetDescription>
						{section.name} · {isInflow ? "Money in" : "Money out"}
					</SheetDescription>
				</SheetHeader>
				<form id="one-off-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="one-off-name">
						Name
						<input
							id="one-off-name"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="one-off-date">
						Date
						<input
							id="one-off-date"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="date"
							value={date}
							onChange={(event) => setDate(event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="one-off-amount">
						Amount
						<input
							id="one-off-amount"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
						/>
					</label>
					<PayFromSelect
						id="one-off-pay-from"
						label={isInflow ? "Receive into" : "Pay from"}
						value={bankAccountId}
						onChange={setBankAccountId}
					/>
					{section.type === "savings" ? <FundSelect value={goalId} onChange={setGoalId} /> : null}
					{oneOff ? (
						<div className="flex flex-col gap-1 text-sm">
							<span>Status</span>
							<Segmented
								aria-label="Status"
								value={status}
								options={STATUS_OPTIONS}
								onValueChange={setStatus}
							/>
						</div>
					) : null}
					{error ? (
						<p role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
				</form>
				<SheetFooter>
					<button
						form="one-off-form"
						type="submit"
						disabled={isBusy}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					>
						Save one-off
					</button>
					{oneOff ? (
						<button
							type="button"
							disabled={isBusy}
							onClick={() => setDeleteOpen(true)}
							className="rounded-md border border-border px-3 py-2 text-sm text-negative transition-colors hover:bg-negative/5 disabled:opacity-60"
						>
							Delete one-off
						</button>
					) : null}
				</SheetFooter>
				{isDeleteOpen && oneOff ? (
					<ConfirmDialog
						title={`Delete ${oneOff.name}?`}
						onCancel={() => setDeleteOpen(false)}
						onConfirm={() => void onDelete()}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
