import type * as React from "react";
import { cn } from "@/lib/cn";

function Input({ className, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			data-slot="input"
			className={cn(
				"h-9 min-w-0 rounded-md border border-border bg-card px-3 text-sm transition-colors placeholder:text-muted-foreground hover:border-foreground/30 disabled:opacity-60",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
