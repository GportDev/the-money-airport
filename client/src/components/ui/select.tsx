import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
	"flex min-w-0 items-center justify-between gap-2 rounded-lg text-left text-sm transition-colors data-[placeholder]:text-muted-foreground disabled:opacity-60",
	{
		variants: {
			variant: {
				outline: "h-9 border border-border bg-card px-3 hover:border-border-strong",
				ghost:
					"h-8 px-2.5 hover:bg-foreground/5 data-[state=open]:bg-foreground/5 [&>span:first-child]:font-medium",
			},
		},
		defaultVariants: { variant: "outline" },
	},
);

type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> &
	VariantProps<typeof selectTriggerVariants> & {
		/** Muted lead-in inside a ghost trigger, e.g. "Sort" or "Timeframe". */
		lead?: React.ReactNode;
		icon?: React.ReactNode;
	};

function SelectTrigger({ className, children, variant, lead, icon, ...props }: SelectTriggerProps) {
	return (
		<SelectPrimitive.Trigger
			className={cn(selectTriggerVariants({ variant }), className)}
			{...props}
		>
			<span className="flex min-w-0 items-center gap-2">
				{icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
				{lead ? <span className="shrink-0 font-normal text-muted-foreground">{lead}</span> : null}
				<span className="truncate">{children}</span>
			</span>
			<SelectPrimitive.Icon>
				<ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				position="popper"
				sideOffset={4}
				className={cn(
					"z-50 max-h-72 min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden rounded-xl border border-border bg-card p-1 text-sm shadow-pop data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
					className,
				)}
				{...props}
			>
				<SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			className={cn(
				"flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 outline-none transition-colors data-[highlighted]:bg-foreground/5",
				className,
			)}
			{...props}
		>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator>
				<Check aria-hidden className="size-4" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, selectTriggerVariants };
