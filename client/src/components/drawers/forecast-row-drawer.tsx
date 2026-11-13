import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FundSelect } from "@/components/forecast/fund-select";
import { PayFromSelect } from "@/components/forecast/pay-from-select";
import { PlanAmountsFields } from "@/components/forecast/plan-amounts-fields";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import {
	useCreateForecastRow,
	useDeleteForecastRow,
	useSetForecastAmounts,
	useUpdateForecastRow,
} from "@/hooks/use-forecast";
import { isInflowSection, MONTH_NUMBERS } from "@/lib/forecast";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import type { ForecastRow, ForecastSection } from "@/types";

type Props = {
	section: ForecastSection;
	/** null opens the create form. */
	row: ForecastRow | null;
	year: number;
	onClose: () => void;
};

function initialAmounts(row: ForecastRow | null) {
	return Object.fromEntries(
		MONTH_NUMBERS.map((month) => {
			const plan = row?.cells[month]?.plan ?? 0;
			return [month, plan === 0 ? "" : centsToMajorUnits(plan)];
		}),
	);
}

function centsByMonth(amounts: Record<number, string>) {
	return Object.fromEntries(
		MONTH_NUMBERS.map((month) => {
			const typed = amounts[month]?.trim() ?? "";
			return [month, typed === "" ? 0 : majorUnitsToCents(typed)];
		}),
	);
}

export function ForecastRowDrawer({ section, row, year, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const create = useCreateForecastRow();
	const update = useUpdateForecastRow();
	const setAmounts = useSetForecastAmounts();
	const remove = useDeleteForecastRow();
	const [name, setName] = useState(row?.name ?? "");
	const [day, setDay] = useState(row?.dayOfMonth ? String(row.dayOfMonth) : "");
	const [bankAccountId, setBankAccountId] = useState(row?.bankAccountId ?? null);
	const [goalId, setGoalId] = useState(row?.goalId ?? null);
	const [amounts, setAmountsDraft] = useState<Record<number, string>>(() => initialAmounts(row));
	const [error, setError] = useState<string | null>(null);
	const [isDeleteOpen, setDeleteOpen] = useState(false);
	const isBusy = create.isPending || update.isPending || setAmounts.isPending || remove.isPending;

	function validationError() {
		const dayNumber = Number(day);
		if (name.trim() === "") return "Enter a name.";
		if (day !== "" && (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31)) {
			return "Day of month is 1 to 31.";
		}
		const cents = Object.values(centsByMonth(amounts));
		if (cents.some((value) => !Number.isFinite(value) || value < 0)) {
			return "Amounts are 0 or more.";
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
			dayOfMonth: day === "" ? null : Number(day),
			bankAccountId,
			goalId: section.type === "savings" ? goalId : null,
		};
		try {
			const saved = row
				? await update.mutateAsync({ id: row.id, ...fields })
				: await create.mutateAsync({ sectionId: section.id, ...fields });
			await setAmounts.mutateAsync({ id: saved.id, year, amounts: centsByMonth(amounts) });
			toast.success("Item saved");
			close();
		} catch (_error) {
			toast.error("Could not save item");
		}
	}

	async function onDelete() {
		if (!row) return;
		setDeleteOpen(false);
		try {
			await remove.mutateAsync(row.id);
			toast.success("Item deleted");
			close();
		} catch (_error) {
			toast.error("Could not delete item");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{row ? row.name : "New item"}</SheetTitle>
					<SheetDescription>{section.name}</SheetDescription>
				</SheetHeader>
				<form id="forecast-row-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="forecast-row-name">
						Name
						<input
							id="forecast-row-name"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm" htmlFor="forecast-row-day">
						Day of month
						<input
							id="forecast-row-day"
							className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
							type="number"
							min="1"
							max="31"
							placeholder={isInflowSection(section.type) ? "1st" : "Last day"}
							value={day}
							onChange={(event) => setDay(event.target.value)}
						/>
					</label>
					<PayFromSelect
						id="forecast-row-pay-from"
						label={isInflowSection(section.type) ? "Receive into" : "Pay from"}
						value={bankAccountId}
						onChange={setBankAccountId}
					/>
					{section.type === "savings" ? <FundSelect value={goalId} onChange={setGoalId} /> : null}
					<PlanAmountsFields year={year} amounts={amounts} onChange={setAmountsDraft} />
					{error ? (
						<p role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
				</form>
				<SheetFooter>
					<button
						form="forecast-row-form"
						type="submit"
						disabled={isBusy}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
					>
						Save item
					</button>
					{row ? (
						<button
							type="button"
							disabled={isBusy}
							onClick={() => setDeleteOpen(true)}
							className="rounded-md border border-border px-3 py-2 text-sm text-negative transition-colors hover:bg-negative/5 disabled:opacity-60"
						>
							Delete item
						</button>
					) : null}
				</SheetFooter>
				{isDeleteOpen && row ? (
					<ConfirmDialog
						title={`Delete ${row.name}? Its Plan amounts go too.`}
						onCancel={() => setDeleteOpen(false)}
						onConfirm={() => void onDelete()}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
