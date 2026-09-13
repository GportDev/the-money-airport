import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Amount({ className, ...props }: ComponentProps<"span">) {
	return <span data-slot="amount" className={cn("amount", className)} {...props} />;
}
