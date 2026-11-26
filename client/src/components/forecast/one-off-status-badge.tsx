import { Badge } from "@/components/ui/badge";
import { ONE_OFF_STATUS_LABELS } from "@/lib/forecast";
import type { OneOffStatus } from "@/types";

const STATUS_TONES = {
	expected: "neutral",
	done: "positive",
	cancelled: "neutral",
} as const satisfies Record<OneOffStatus, "neutral" | "positive">;

export function OneOffStatusBadge({ status }: { status: OneOffStatus }) {
	return (
		<Badge
			tone={STATUS_TONES[status]}
			className={status === "cancelled" ? "line-through" : undefined}
		>
			{ONE_OFF_STATUS_LABELS[status]}
		</Badge>
	);
}
