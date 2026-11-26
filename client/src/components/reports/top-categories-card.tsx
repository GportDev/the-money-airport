import { ReportCard } from "@/components/reports/report-card";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Amount } from "@/components/ui/amount";
import { ShareBar } from "@/components/ui/share-bar";
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
			onRetry={() => void top.refetch()}
			title="Top categories"
			info="The categories you spent the most on in this range."
			status={reportStatus(top, (report) => report.categories.length === 0)}
			omittedCurrencies={top.data?.omittedCurrencies}
			emptyMessage="No spending in this range."
		>
			<ol className="flex flex-col gap-1">
				{categories.map((row, index) => (
					<li key={row.categoryId}>
						<button
							type="button"
							className="flex w-full flex-col gap-1.5 px-2 py-2 text-left text-sm row-hover"
							onClick={() => onSelect(row)}
						>
							<span className="flex w-full items-center gap-2">
								<span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
								<CategoryIcon icon={row.icon} color={row.color} />
								<span className="min-w-0 flex-1 truncate font-medium">{row.categoryName}</span>
								<Amount>{formatMoney(row.total, currency)}</Amount>
							</span>
							<ShareBar value={row.total} max={largest} color={row.color} className="ml-6 w-auto" />
						</button>
					</li>
				))}
			</ol>
		</ReportCard>
	);
}
