import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = { value: ReactNode; caption: string; className?: string };

/** A small gray tile for a secondary fact: value over a one-line caption. */
export function StatTile({ value, caption, className }: Props) {
	return (
		<div
			className={cn("flex flex-col gap-0.5 rounded-xl bg-foreground/[0.03] px-3 py-2.5", className)}
		>
			<span className="text-lg leading-tight">{value}</span>
			<span className="text-xs text-muted-foreground">{caption}</span>
		</div>
	);
}
