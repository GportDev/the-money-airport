import { cva, type VariantProps } from "class-variance-authority";
import { ToggleGroup } from "radix-ui";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string; count?: number };

const segmentedVariants = cva(
	"relative isolate inline-flex rounded-lg bg-foreground/[0.04] p-[3px] shadow-[inset_0_0_0_1px_var(--border)]",
	{
		variants: {
			size: {
				default: "text-sm [&_[data-slot=segmented-item]]:h-7 [&_[data-slot=segmented-item]]:px-3",
				sm: "text-xs [&_[data-slot=segmented-item]]:h-6 [&_[data-slot=segmented-item]]:px-2.5",
			},
		},
		defaultVariants: { size: "default" },
	},
);

type Props<T extends string> = VariantProps<typeof segmentedVariants> & {
	value: T;
	options: Option<T>[];
	onValueChange: (value: T) => void;
	"aria-label": string;
	className?: string;
};

type Thumb = { left: number; width: number };

/** A single-choice pill row; a raised white thumb slides to the active option. */
export function Segmented<T extends string>({
	value,
	options,
	onValueChange,
	size,
	className,
	...props
}: Props<T>) {
	const rootRef = useRef<HTMLDivElement>(null);
	const thumb = useActiveThumb(rootRef, value);

	return (
		<ToggleGroup.Root
			ref={rootRef}
			type="single"
			value={value}
			onValueChange={(next: string) => {
				if (next) onValueChange(next as T);
			}}
			className={cn(segmentedVariants({ size }), className)}
			{...props}
		>
			{thumb ? (
				<span
					aria-hidden
					className="absolute inset-y-[3px] left-0 -z-10 rounded-md bg-card shadow-float ring-1 ring-border transition-[translate,width] duration-200 ease-out motion-reduce:transition-none"
					// Position comes from the measured active option, so it cannot be a class.
					style={{ width: thumb.width, translate: `${thumb.left}px 0` }}
				/>
			) : null}
			{options.map((option) => (
				<ToggleGroup.Item
					key={option.value}
					value={option.value}
					data-slot="segmented-item"
					className="group inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground data-[state=on]:font-medium data-[state=on]:text-foreground"
				>
					{option.label}
					{option.count === undefined ? null : (
						<span className="amount text-muted-foreground tabular-nums group-data-[state=on]:text-foreground">
							{option.count}
						</span>
					)}
				</ToggleGroup.Item>
			))}
		</ToggleGroup.Root>
	);
}

/** Measures the checked option so the thumb can sit under it and slide between options. */
function useActiveThumb(rootRef: React.RefObject<HTMLDivElement | null>, value: string) {
	const [thumb, setThumb] = useState<Thumb | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the value moves.
	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const measure = () => {
			const active = root.querySelector<HTMLElement>(
				'[data-slot="segmented-item"][data-state="on"]',
			);
			setThumb(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		return () => observer.disconnect();
	}, [rootRef, value]);
	return thumb;
}
