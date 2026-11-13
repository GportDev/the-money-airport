import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	addRowsFromCategories,
	createForecastRow,
	createOneOff,
	deleteForecastRow,
	deleteOneOff,
	getForecastMonth,
	getForecastSections,
	getForecastSummary,
	setForecastAmounts,
	updateForecastRow,
	updateOneOff,
} from "@/api/forecast";

const STALE_TIME = 5 * 60 * 1000;

export function useForecastSections(year: number) {
	return useQuery({
		queryKey: ["forecast", "sections", year],
		queryFn: () => getForecastSections(year),
		staleTime: STALE_TIME,
	});
}

export function useForecastSummary(year: number) {
	return useQuery({
		queryKey: ["forecast", "summary", year],
		queryFn: () => getForecastSummary(year),
		staleTime: STALE_TIME,
	});
}

export function useForecastMonth(year: number, month: number) {
	return useQuery({
		queryKey: ["forecast", "month", year, month],
		queryFn: () => getForecastMonth(year, month),
		staleTime: STALE_TIME,
	});
}

/** Any plan edit moves the projection, so every Forecast view refetches. */
function useForecastMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => client.invalidateQueries({ queryKey: ["forecast"] }),
	});
}

export function useCreateForecastRow() {
	return useForecastMutation(createForecastRow);
}

export function useUpdateForecastRow() {
	return useForecastMutation(updateForecastRow);
}

export function useSetForecastAmounts() {
	return useForecastMutation(setForecastAmounts);
}

export function useDeleteForecastRow() {
	return useForecastMutation(deleteForecastRow);
}

export function useAddRowsFromCategories() {
	return useForecastMutation(addRowsFromCategories);
}

export function useCreateOneOff() {
	return useForecastMutation(createOneOff);
}

export function useUpdateOneOff() {
	return useForecastMutation(updateOneOff);
}

export function useDeleteOneOff() {
	return useForecastMutation(deleteOneOff);
}
