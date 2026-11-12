import { BudgetAmounts } from "@/components/budget/budget-amounts";
import { BudgetProgress } from "@/components/budget/budget-progress";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { isOverBudget } from "@/lib/budget";
import type { BudgetCategoryRow as Row } from "@/types";

type Props = {
	row: Row;
	currency: string;
	onOpen: (row: Row) => void;
};

export function BudgetCategoryRow({ row, currency, onOpen }: Props) {
	return (
		<li>
			<button
				type="button"
				className="flex w-full flex-col gap-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-foreground/5 sm:flex-row sm:items-center sm:gap-4"
				onClick={() => onOpen(row)}
			>
				<span className="flex min-w-0 flex-1 items-center gap-3">
					<CategoryIcon icon={row.categoryIcon} color={row.categoryColor} />
					<span className="w-32 truncate text-sm">{row.categoryName}</span>
					<BudgetProgress
						label={`${row.categoryName} budget used`}
						planned={row.planned}
						actual={row.actual}
						isOver={isOverBudget(row.group, row.planned, row.actual)}
						className="h-1.5 flex-1"
					/>
				</span>
				<BudgetAmounts
					planned={row.planned}
					actual={row.actual}
					remaining={row.remaining}
					currency={currency}
				/>
			</button>
		</li>
	);
}
