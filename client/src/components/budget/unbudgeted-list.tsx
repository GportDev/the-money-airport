import { BudgetCategoryRow } from "@/components/budget/budget-category-row";
import type { BudgetCategoryRow as Row } from "@/types";

type Props = {
	rows: Row[];
	currency: string;
	onOpen: (row: Row) => void;
};

export function UnbudgetedList({ rows, currency, onOpen }: Props) {
	return (
		<section aria-label="Unbudgeted" className="rounded-xl border border-border bg-card">
			<h3 className="px-3 py-3 text-sm font-medium">Unbudgeted</h3>
			{rows.length > 0 ? (
				<ul className="divide-y divide-border border-t border-border">
					{rows.map((row) => (
						<BudgetCategoryRow key={row.categoryId} row={row} currency={currency} onOpen={onOpen} />
					))}
				</ul>
			) : (
				<p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">
					Every category has a plan this month.
				</p>
			)}
		</section>
	);
}
