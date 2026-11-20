import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-[color,background-color,border-color,opacity,scale] duration-150 ease-out active:not-disabled:scale-[0.97] disabled:opacity-60 motion-reduce:active:not-disabled:scale-100",
	{
		variants: {
			variant: {
				primary: "bg-primary text-primary-foreground hover:bg-primary/85",
				outline: "border border-border bg-card text-foreground hover:bg-foreground/5",
				ghost: "hover:bg-foreground/5",
				danger: "bg-negative text-primary-foreground hover:bg-negative/85",
				"danger-outline": "border border-border bg-card text-negative hover:bg-negative/5",
			},
			size: {
				default: "h-9 px-3",
				sm: "h-7 px-2.5 text-xs",
				icon: "size-8",
				"icon-sm": "size-7",
			},
		},
		defaultVariants: { variant: "primary", size: "default" },
	},
);

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
	const Component = asChild ? Slot.Root : "button";
	return (
		<Component
			data-slot="button"
			type={asChild ? undefined : (type ?? "button")}
			className={cn(buttonVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
