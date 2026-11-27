import type { UseQueryResult } from "@tanstack/react-query";
import { useIsSlow } from "@/hooks/use-is-slow";

type QueryWithoutStaleData<TData> = Omit<UseQueryResult<TData>, "data" | "isPending"> & {
	data: TData | undefined;
	isPending: boolean;
};

/**
 * `keepPreviousData` bridges a quick month or range change. When the new fetch is slow, as on a
 * cold server, the old numbers would sit there unmarked, so the query reports no data and the
 * page falls back to its skeleton until the new data lands.
 */
export function useHideSlowPlaceholder<TData>(
	query: UseQueryResult<TData>,
): QueryWithoutStaleData<TData> {
	const isSlow = useIsSlow(query.isPlaceholderData);
	if (!isSlow) return query;
	return { ...query, data: undefined, isPending: true };
}
