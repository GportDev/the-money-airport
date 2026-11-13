import { useState } from "react";
import { useSearchParams } from "react-router";
import { ReportTransactionsDrawer } from "@/components/drawers/report-transactions-drawer";
import { TransactionDrawer } from "@/components/drawers/transaction-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { BalanceHistoryCard } from "@/components/reports/balance-history-card";
import { IncomeExpensesCard } from "@/components/reports/income-expenses-card";
import { NetCashFlowCard } from "@/components/reports/net-cash-flow-card";
import { ReportRangePicker } from "@/components/reports/report-range-picker";
import { SpendingByCategoryCard } from "@/components/reports/spending-by-category-card";
import { TopCategoriesCard } from "@/components/reports/top-categories-card";
import { formatLongDate } from "@/lib/format";
import {
	monthWithinRange,
	parseReportRange,
	type ReportPreset,
	reportMonthLabel,
} from "@/lib/report-range";
import type { CategoryTotal, ReportRange, TransactionFilters } from "@/types";

type Drilldown = { title: string; description: string; filters: TransactionFilters };

function rangeLabel(range: ReportRange) {
	return `${formatLongDate(range.dateFrom)} – ${formatLongDate(range.dateTo)}`;
}

export function ReportsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { preset, range } = parseReportRange(searchParams);
	const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
	const [transactionId, setTransactionId] = useState<string | null>(null);

	function selectPreset(next: ReportPreset) {
		setSearchParams((current) => {
			const params = new URLSearchParams(current);
			params.set("range", next);
			if (next === "custom") {
				params.set("from", range.dateFrom);
				params.set("to", range.dateTo);
			} else {
				params.delete("from");
				params.delete("to");
			}
			return params;
		});
	}

	function selectCustom(next: ReportRange) {
		setSearchParams((current) => {
			const params = new URLSearchParams(current);
			params.set("range", "custom");
			params.set("from", next.dateFrom);
			params.set("to", next.dateTo);
			return params;
		});
	}

	function openCategory(category: CategoryTotal) {
		setDrilldown({
			title: category.categoryName,
			description: rangeLabel(range),
			filters: { ...range, categoryIds: [category.categoryId] },
		});
	}

	function openMonth(month: string) {
		const within = monthWithinRange(month, range);
		setDrilldown({
			title: reportMonthLabel(month),
			description: rangeLabel(within),
			filters: within,
		});
	}

	return (
		<>
			<PageHeader title="Reports">
				<ReportRangePicker
					preset={preset}
					range={range}
					onPresetChange={selectPreset}
					onCustomChange={selectCustom}
				/>
			</PageHeader>

			<div className="grid gap-4 lg:grid-cols-2">
				<SpendingByCategoryCard range={range} onSelect={openCategory} />
				<IncomeExpensesCard range={range} onSelectMonth={openMonth} />
				<TopCategoriesCard range={range} onSelect={openCategory} />
				<NetCashFlowCard range={range} onSelectMonth={openMonth} />
				<BalanceHistoryCard range={range} />
			</div>

			{transactionId ? (
				<TransactionDrawer
					key={transactionId}
					transactionId={transactionId}
					onClose={() => setTransactionId(null)}
					onOpenSimilar={setTransactionId}
				/>
			) : drilldown ? (
				<ReportTransactionsDrawer
					{...drilldown}
					onClose={() => setDrilldown(null)}
					onOpenTransaction={setTransactionId}
				/>
			) : null}
		</>
	);
}
