import { api } from "@/api/client";
import type {
	BalanceHistoryReport,
	CashFlowTrendReport,
	IncomeVsExpensesReport,
	ReportRange,
	SpendingReport,
} from "@/types";

function rangeQuery(range: ReportRange) {
	return new URLSearchParams({ dateFrom: range.dateFrom, dateTo: range.dateTo }).toString();
}

export function getSpendingByCategory(range: ReportRange) {
	return api<SpendingReport>(`/reports/spending-by-category?${rangeQuery(range)}`);
}

export function getTopCategories(range: ReportRange, limit = 5) {
	return api<SpendingReport>(`/reports/top-categories?${rangeQuery(range)}&limit=${limit}`);
}

export function getIncomeVsExpenses(range: ReportRange) {
	return api<IncomeVsExpensesReport>(`/reports/income-vs-expenses?${rangeQuery(range)}`);
}

export function getCashFlowTrend(range: ReportRange) {
	return api<CashFlowTrendReport>(`/reports/cash-flow-trend?${rangeQuery(range)}`);
}

export function getBalanceHistory(range: ReportRange) {
	return api<BalanceHistoryReport>(`/reports/balance-history?${rangeQuery(range)}`);
}
