import { Badge, BadgeDot } from "@/components/ui/badge";
import type { Goal } from "@/types";

type Props = { status: Goal["status"]; hasDate: boolean };

/** Status only means something against a target date, so undated Goals show none. */
export function GoalStatusBadge({ status, hasDate }: Props) {
	if (!hasDate) {
		return null;
	}
	const isAtRisk = status === "at_risk";
	return (
		<Badge tone={isAtRisk ? "negative" : "positive"}>
			<BadgeDot />
			{isAtRisk ? "At risk" : "On track"}
		</Badge>
	);
}
