import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryLegend } from "@/components/reports/category-legend";
import { ReportCard } from "@/components/reports/report-card";
import { useSpendingByCategory } from "@/hooks/use-reports";
import { formatMoney } from "@/lib/format";
import { reportStatus } from "@/lib/report-status";
import type { CategoryTotal, ReportRange } from "@/types";

type Props = {
	range: ReportRange;
	onSelect: (category: CategoryTotal) => void;
};

export function SpendingByCategoryCard({ range, onSelect }: Props) {
	const spending = useSpendingByCategory(range);
	const data = spending.data;
	const currency = data?.baseCurrency ?? "USD";
	return (
		<ReportCard
			title="Spending by category"
			status={reportStatus(spending, (report) => report.categories.length === 0)}
			omittedCurrencies={spending.data?.omittedCurrencies}
			emptyMessage="No spending in this range."
		>
			<div className="grid items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
				<figure aria-label="Spending by category chart" className="mx-auto size-40">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data?.categories ?? []}
								dataKey="total"
								nameKey="categoryName"
								innerRadius="60%"
								outerRadius="100%"
								paddingAngle={1}
								isAnimationActive={false}
								onClick={(slice: { payload?: CategoryTotal }) => {
									if (slice.payload) onSelect(slice.payload);
								}}
							>
								{(data?.categories ?? []).map((row) => (
									// Category colors are User data, so they come in as fills, not tokens.
									<Cell key={row.categoryId} fill={row.color} className="cursor-pointer" />
								))}
							</Pie>
							<Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
						</PieChart>
					</ResponsiveContainer>
				</figure>
				<CategoryLegend
					categories={data?.categories ?? []}
					currency={currency}
					onSelect={onSelect}
				/>
			</div>
		</ReportCard>
	);
}
