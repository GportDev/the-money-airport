import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
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
import { useDeleteBudget, useSaveBudget } from "@/hooks/use-budgets";
import { centsToMajorUnits, formatMoney, majorUnitsToCents } from "@/lib/format";
import type { BudgetCategoryRow } from "@/types";

type Props = {
	row: BudgetCategoryRow;
	/** First day of the month, YYYY-MM-DD. */
	month: string;
	monthName: string;
	currency: string;
	onClose: () => void;
};

export function BudgetCategoryDrawer({ row, month, monthName, currency, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const save = useSaveBudget();
	const remove = useDeleteBudget();
	const [planned, setPlanned] = useState(row.id ? centsToMajorUnits(row.planned) : "");
	const [error, setError] = useState<string | null>(null);
	const isBusy = save.isPending || remove.isPending;

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const amount = majorUnitsToCents(planned);
		if (planned.trim() === "" || !Number.isFinite(amount) || amount < 0) {
			setError("Enter a planned amount of 0 or more.");
			return;
		}
		setError(null);
		try {
			await save.mutateAsync({ categoryId: row.categoryId, month, amount });
			toast.success("Budget saved");
			close();
		} catch (_error) {
			toast.error("Could not save budget");
		}
	}

	async function onRemove() {
		if (!row.id) return;
		try {
			await remove.mutateAsync(row.id);
			toast.success("Plan removed");
			close();
		} catch (_error) {
			toast.error("Could not remove plan");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<CategoryIcon icon={row.categoryIcon} color={row.categoryColor} />
						{row.categoryName}
					</SheetTitle>
					<SheetDescription>Planned amount for {monthName}.</SheetDescription>
				</SheetHeader>
				<form id="budget-category-form" className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
					<label className="flex flex-col gap-1 text-sm" htmlFor="budget-planned">
						Planned
						<Input
							id="budget-planned"
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={planned}
							onChange={(event) => setPlanned(event.target.value)}
							aria-invalid={Boolean(error)}
							aria-describedby={error ? "budget-planned-error" : undefined}
						/>
					</label>
					{error ? (
						<p id="budget-planned-error" role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
					<p className="text-sm text-muted-foreground">
						{row.group === "income" ? "Received" : "Spent"} so far:{" "}
						<Amount className="text-foreground">{formatMoney(row.actual, currency)}</Amount>
					</p>
				</form>
				<SheetFooter>
					<Button form="budget-category-form" type="submit" disabled={isBusy}>
						{save.isPending ? "Saving…" : "Save"}
					</Button>
					{row.id ? (
						<Button
							variant="danger-outline"
							type="button"
							disabled={isBusy}
							onClick={() => void onRemove()}
						>
							{remove.isPending ? "Removing…" : "Remove plan"}
						</Button>
					) : null}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
