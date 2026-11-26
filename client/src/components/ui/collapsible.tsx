import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

/** Content that eases its height open and closed; reduced motion keeps only the fade. */
function CollapsibleContent({
	className,
	...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
	return (
		<CollapsiblePrimitive.Content
			className={cn(
				"overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-fade-in",
				className,
			)}
			{...props}
		/>
	);
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
