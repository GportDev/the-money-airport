import { toast } from "sonner";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { InlineText } from "@/components/ui/inline-text";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
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

/** One Category's plan for the month; the planned amount saves as soon as it changes. */
export function BudgetCategoryDrawer({ row, month, monthName, currency, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const save = useSaveBudget();
	const remove = useDeleteBudget();

	function savePlanned(value: string) {
		const amount = majorUnitsToCents(value);
		if (!Number.isFinite(amount) || amount < 0) {
			throw new Error("Enter a planned amount of 0 or more.");
		}
		return save.mutateAsync({ categoryId: row.categoryId, month, amount });
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
				<SheetHeader className="pr-12">
					<SheetTitle className="flex items-center gap-2 text-xl tracking-tight">
						<CategoryIcon icon={row.categoryIcon} color={row.categoryColor} />
						{row.categoryName}
					</SheetTitle>
					<SheetDescription>Planned amount for {monthName}.</SheetDescription>
				</SheetHeader>
				<PropertyList className="mx-4">
					<PropertyRow label="Planned">
						<InlineText
							aria-label="Planned"
							inputMode="decimal"
							placeholder="0.00"
							value={row.id ? centsToMajorUnits(row.planned) : ""}
							onCommit={savePlanned}
							className="amount -ml-2"
						/>
					</PropertyRow>
					<PropertyRow label={row.group === "income" ? "Received" : "Spent"}>
						<Amount>{formatMoney(row.actual, currency)}</Amount>
					</PropertyRow>
				</PropertyList>
				{row.id ? (
					<SheetFooter>
						<Button
							variant="danger-outline"
							type="button"
							disabled={remove.isPending}
							onClick={() => void onRemove()}
						>
							{remove.isPending ? "Removing…" : "Remove plan"}
						</Button>
					</SheetFooter>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
