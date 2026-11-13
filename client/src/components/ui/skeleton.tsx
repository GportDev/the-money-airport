import type * as React from "react";
import { cn } from "@/lib/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			aria-hidden
			className={cn("animate-pulse rounded-md bg-foreground/[0.06]", className)}
			{...props}
		/>
	);
}

/** Announces a loading region once; the blocks inside stay silent. */
function SkeletonGroup({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<output aria-label={label} aria-busy="true" className={cn("block", className)}>
			{children}
		</output>
	);
}

/** A card frame with a title bar; the body defaults to one block. */
function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
	return (
		<div
			className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)}
		>
			<Skeleton className="h-4 w-32" />
			{children ?? <Skeleton className="h-24 w-full" />}
		</div>
	);
}

/** List rows shaped like a transaction or account row: icon, two lines, amount. */
function SkeletonRows({ count }: { count: number }) {
	return (
		<ul className="flex flex-col gap-2">
			{Array.from({ length: count }, (_, index) => (
				<li
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows.
					key={index}
					className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3"
				>
					<Skeleton className="size-8 shrink-0 rounded-full" />
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<Skeleton className="h-3.5 w-2/5" />
						<Skeleton className="h-3 w-1/4" />
					</div>
					<Skeleton className="h-4 w-16 shrink-0" />
				</li>
			))}
		</ul>
	);
}

export { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows };
