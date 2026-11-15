import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createRecurring,
	deleteRecurring,
	detectRecurring,
	getRecurring,
	markRecurringPaid,
	skipRecurring,
	updateRecurring,
} from "@/api/recurring";

const STALE_TIME = 5 * 60 * 1000;

export function useRecurring() {
	return useQuery({
		queryKey: ["recurring", "month"],
		queryFn: getRecurring,
		staleTime: STALE_TIME,
	});
}

/** Read-only, though the route is a POST: it suggests patterns and stores nothing. */
export function useRecurringCandidates() {
	return useQuery({
		queryKey: ["recurring", "detect"],
		queryFn: detectRecurring,
		staleTime: STALE_TIME,
	});
}

/** RecurringItems feed the Dashboard widget and Forecast rows linked to them. */
function useRecurringMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["recurring"] });
			void client.invalidateQueries({ queryKey: ["dashboard"] });
			void client.invalidateQueries({ queryKey: ["forecast"] });
		},
	});
}

export function useCreateRecurring() {
	return useRecurringMutation(createRecurring);
}

export function useUpdateRecurring() {
	return useRecurringMutation(updateRecurring);
}

export function useMarkRecurringPaid() {
	return useRecurringMutation(markRecurringPaid);
}

export function useSkipRecurring() {
	return useRecurringMutation(skipRecurring);
}

export function useDeleteRecurring() {
	return useRecurringMutation(deleteRecurring);
}
