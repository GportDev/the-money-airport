import { cn } from "@/lib/cn";
import type { Goal } from "@/types";

type Props = { status: Goal["status"]; hasDate: boolean };

/** Status only means something against a target date, so undated Goals show none. */
export function GoalStatusBadge({ status, hasDate }: Props) {
	if (!hasDate) {
		return null;
	}
	const isAtRisk = status === "at_risk";
	return (
		<span
			className={cn(
				"rounded-full px-2 py-0.5 text-xs",
				isAtRisk ? "bg-negative/10 text-negative" : "bg-positive/10 text-positive",
			)}
		>
			{isAtRisk ? "At risk" : "On track"}
		</span>
	);
}
