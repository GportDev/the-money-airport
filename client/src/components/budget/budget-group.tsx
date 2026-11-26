import { ChevronDown } from "lucide-react";
import { BudgetAmounts } from "@/components/budget/budget-amounts";
import { BudgetCategoryRow } from "@/components/budget/budget-category-row";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BUDGET_GROUP_LABELS } from "@/lib/budget";
import type { BudgetGroupSummary, BudgetCategoryRow as Row } from "@/types";

type Props = {
	group: BudgetGroupSummary;
	currency: string;
	onOpen: (row: Row) => void;
};

/** Collapsible group: header rolls up the group, rows are its planned Categories. */
export function BudgetGroup({ group, currency, onOpen }: Props) {
	const label = BUDGET_GROUP_LABELS[group.key];
	return (
		<Collapsible defaultOpen asChild>
			<section aria-label={label} className="rounded-xl border border-border bg-card">
				<CollapsibleTrigger className="group flex w-full flex-col gap-2 px-3 py-3 text-left row-hover sm:flex-row sm:items-center sm:gap-4">
					<span className="flex flex-1 items-center gap-2 text-sm font-medium">
						<ChevronDown
							aria-hidden
							className="size-4 transition-transform group-data-[state=closed]:-rotate-90"
						/>
						{label}
					</span>
					<BudgetAmounts
						planned={group.planned}
						actual={group.actual}
						remaining={group.remaining}
						currency={currency}
						className="font-medium"
					/>
				</CollapsibleTrigger>
				<CollapsibleContent>
					{group.categories.length > 0 ? (
						<ul className="divide-y divide-border border-t border-border">
							{group.categories.map((row) => (
								<BudgetCategoryRow
									key={row.categoryId}
									row={row}
									currency={currency}
									onOpen={onOpen}
								/>
							))}
						</ul>
					) : (
						<p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">
							Nothing planned. Use Show unbudgeted to plan a category.
						</p>
					)}
				</CollapsibleContent>
			</section>
		</Collapsible>
	);
}
