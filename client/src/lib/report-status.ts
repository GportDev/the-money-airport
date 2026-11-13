export type ReportStatus = "loading" | "error" | "empty" | "ready";

/** Card state for a report query; `isEmpty` only runs once data is in. */
export function reportStatus<T>(
	query: { data: T | undefined; isError: boolean },
	isEmpty: (data: T) => boolean,
): ReportStatus {
	if (query.isError) return "error";
	if (query.data === undefined) return "loading";
	return isEmpty(query.data) ? "empty" : "ready";
}
