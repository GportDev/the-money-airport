import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/types";

type Props = {
	categories: CategoryTotal[];
	currency: string;
	onSelect: (category: CategoryTotal) => void;
};

export function CategoryLegend({ categories, currency, onSelect }: Props) {
	const total = categories.reduce((sum, row) => sum + row.total, 0);
	return (
		<ul className="flex flex-col">
			{categories.map((row) => (
				<li key={row.categoryId}>
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5"
						onClick={() => onSelect(row)}
					>
						<CategoryIcon icon={row.icon} color={row.color} />
						<span className="min-w-0 flex-1 truncate">{row.categoryName}</span>
						<span className="text-xs text-muted-foreground">
							{total === 0 ? 0 : Math.round((row.total / total) * 100)}%
						</span>
						<Amount className="w-24 text-right">{formatMoney(row.total, currency)}</Amount>
					</button>
				</li>
			))}
		</ul>
	);
}
