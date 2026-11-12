import { ReportCard } from "@/components/reports/report-card";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { useTopCategories } from "@/hooks/use-reports";
import { formatMoney } from "@/lib/format";
import { reportStatus } from "@/lib/report-status";
import type { CategoryTotal, ReportRange } from "@/types";

type Props = {
	range: ReportRange;
	onSelect: (category: CategoryTotal) => void;
};

export function TopCategoriesCard({ range, onSelect }: Props) {
	const top = useTopCategories(range);
	const categories = top.data?.categories ?? [];
	const currency = top.data?.baseCurrency ?? "USD";
	const largest = categories[0]?.total ?? 0;
	return (
		<ReportCard
			title="Top categories"
			status={reportStatus(top, (report) => report.categories.length === 0)}
			omittedCurrencies={top.data?.omittedCurrencies}
			emptyMessage="No spending in this range."
		>
			<ol className="flex flex-col gap-1">
				{categories.map((row, index) => (
					<li key={row.categoryId}>
						<button
							type="button"
							className="flex w-full flex-col gap-1.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-foreground/5"
							onClick={() => onSelect(row)}
						>
							<span className="flex w-full items-center gap-2">
								<span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
								<CategoryIcon icon={row.icon} color={row.color} />
								<span className="min-w-0 flex-1 truncate font-medium">{row.categoryName}</span>
								<Amount>{formatMoney(row.total, currency)}</Amount>
							</span>
							<span aria-hidden className="ml-6 h-1.5 rounded-full bg-muted">
								<span
									className="block h-full rounded-full"
									// Width tracks the amount and the fill is the Category's own color.
									style={{
										width: `${largest === 0 ? 0 : (row.total / largest) * 100}%`,
										backgroundColor: row.color,
									}}
								/>
							</span>
						</button>
					</li>
				))}
			</ol>
		</ReportCard>
	);
}
