import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	getBalanceHistory,
	getCashFlowTrend,
	getIncomeVsExpenses,
	getSpendingByCategory,
	getTopCategories,
} from "@/api/reports";
import type { ReportRange } from "@/types";

const REPORT_STALE_TIME = 5 * 60 * 1000;

function useReport<T>(
	name: string,
	range: ReportRange,
	fetcher: (range: ReportRange) => Promise<T>,
) {
	return useQuery({
		queryKey: ["reports", name, range.dateFrom, range.dateTo],
		queryFn: () => fetcher(range),
		staleTime: REPORT_STALE_TIME,
		placeholderData: keepPreviousData,
	});
}

export function useSpendingByCategory(range: ReportRange) {
	return useReport("spending-by-category", range, getSpendingByCategory);
}

export function useTopCategories(range: ReportRange) {
	return useReport("top-categories", range, (value) => getTopCategories(value));
}

export function useIncomeVsExpenses(range: ReportRange) {
	return useReport("income-vs-expenses", range, getIncomeVsExpenses);
}

export function useCashFlowTrend(range: ReportRange) {
	return useReport("cash-flow-trend", range, getCashFlowTrend);
}

export function useBalanceHistory(range: ReportRange) {
	return useReport("balance-history", range, getBalanceHistory);
}
