import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { ShareBar } from "@/components/ui/share-bar";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/types";

type Props = {
	categories: CategoryTotal[];
	currency: string;
	onSelect: (category: CategoryTotal) => void;
};

export function CategoryLegend({ categories, currency, onSelect }: Props) {
	const total = categories.reduce((sum, row) => sum + row.total, 0);
	const largest = Math.max(0, ...categories.map((row) => row.total));
	return (
		<ul className="flex flex-col">
			{categories.map((row) => (
				<li key={row.categoryId}>
					<button
						type="button"
						className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm row-hover"
						onClick={() => onSelect(row)}
					>
						<CategoryIcon icon={row.icon} color={row.color} />
						<span className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="truncate">{row.categoryName}</span>
							<ShareBar value={row.total} max={largest} color={row.color} />
						</span>
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
