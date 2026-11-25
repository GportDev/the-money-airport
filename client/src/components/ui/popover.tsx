import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

const Popover = PopoverPrimitive.Root;

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/** Floats under its trigger without a backdrop, so the rest of the page stays usable. */
function PopoverContent({
	className,
	align = "end",
	sideOffset = 6,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot="popover-content"
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"z-50 flex w-72 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
