import { cva } from "class-variance-authority";
import { ONE_OFF_STATUS_LABELS } from "@/lib/forecast";
import type { OneOffStatus } from "@/types";

const badge = cva("rounded-full px-2 py-0.5 text-xs font-medium", {
	variants: {
		status: {
			expected: "bg-muted text-muted-foreground",
			done: "bg-positive/10 text-positive",
			cancelled: "bg-foreground/5 text-muted-foreground line-through",
		},
	},
});

export function OneOffStatusBadge({ status }: { status: OneOffStatus }) {
	return <span className={badge({ status })}>{ONE_OFF_STATUS_LABELS[status]}</span>;
}
