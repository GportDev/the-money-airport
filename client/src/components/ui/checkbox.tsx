import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"flex size-4 shrink-0 items-center justify-center rounded border border-border bg-card transition-colors hover:border-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator>
				<Check aria-hidden className="size-3" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}
