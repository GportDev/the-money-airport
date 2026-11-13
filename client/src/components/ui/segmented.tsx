import { ToggleGroup } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
	value: T;
	options: Option<T>[];
	onValueChange: (value: T) => void;
	"aria-label": string;
	className?: string;
};

/** A single-choice pill row. Clicking the active option keeps it selected. */
export function Segmented<T extends string>({
	value,
	options,
	onValueChange,
	className,
	...props
}: Props<T>) {
	return (
		<ToggleGroup.Root
			type="single"
			value={value}
			onValueChange={(next: string) => {
				if (next) onValueChange(next as T);
			}}
			className={cn("inline-flex rounded-md border border-border p-0.5 text-sm", className)}
			{...props}
		>
			{options.map((option) => (
				<SegmentedItem key={option.value} value={option.value}>
					{option.label}
				</SegmentedItem>
			))}
		</ToggleGroup.Root>
	);
}

function SegmentedItem(props: React.ComponentProps<typeof ToggleGroup.Item>) {
	return (
		<ToggleGroup.Item
			className="rounded px-3 py-1 transition-colors hover:bg-foreground/5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
			{...props}
		/>
	);
}
