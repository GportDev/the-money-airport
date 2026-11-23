import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

const TOOLTIP_DELAY_MS = 150;

/** Brings its own Provider, so a tooltip works wherever it is placed. */
function Tooltip({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipPrimitive.Provider delayDuration={TOOLTIP_DELAY_MS}>
			<TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	sideOffset = 6,
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					"z-50 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md data-[state=closed]:animate-pop-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in",
					className,
				)}
				{...props}
			>
				{children}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipTrigger };
