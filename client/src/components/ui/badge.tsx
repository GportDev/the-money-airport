import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
	"inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
	{
		variants: {
			tone: {
				neutral: "bg-foreground/[0.06] text-muted-foreground",
				positive: "bg-positive/10 text-positive",
				negative: "bg-negative/10 text-negative",
				warning: "bg-warning/10 text-warning",
				accent: "bg-primary/10 text-primary",
			},
		},
		defaultVariants: { tone: "neutral" },
	},
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

/** A soft status pill: tinted wash, matching text, never a colored border. */
function Badge({ className, tone, ...props }: BadgeProps) {
	return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Leading dot in the badge's own color. */
function BadgeDot({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span aria-hidden className={cn("size-1.5 rounded-full bg-current", className)} {...props} />
	);
}

export { Badge, BadgeDot, badgeVariants };
