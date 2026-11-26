import { type ReactNode, useEffect, useRef, useState } from "react";
import { useScrollContainer } from "@/components/layout/scroll-container";
import { cn } from "@/lib/cn";

type Props = { "aria-label": string; className?: string; children: ReactNode };

/**
 * Floating filter bar that sticks to the top of the page scroll area. It lifts with a soft
 * shadow only once content scrolls under it.
 */
// CONVENTION-DEVIATION: a plain role="toolbar" instead of Radix Toolbar, because it hosts a
// search input and selects, where roving arrow-key focus would fight the caret.
function Toolbar({ className, children, ...props }: Props) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const isStuck = useIsStuck(sentinelRef);
	return (
		<>
			<div ref={sentinelRef} aria-hidden className="h-px" />
			<div
				role="toolbar"
				aria-label={props["aria-label"]}
				data-stuck={isStuck || undefined}
				className={cn(
					"sticky top-3 z-20 mb-4 flex items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 px-2 py-1.5 backdrop-blur-sm transition-shadow duration-150 ease-out data-[stuck]:shadow-float",
					className,
				)}
			>
				{children}
			</div>
		</>
	);
}

function ToolbarGroup({ className, children }: { className?: string; children: ReactNode }) {
	return <div className={cn("flex shrink-0 items-center gap-1", className)}>{children}</div>;
}

function ToolbarDivider() {
	return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function ToolbarSpacer() {
	return <span aria-hidden className="flex-1" />;
}

/** True once the sentinel above the bar has scrolled out of the page scroll area. */
function useIsStuck(sentinelRef: React.RefObject<HTMLDivElement | null>) {
	const scrollRef = useScrollContainer();
	const [isStuck, setIsStuck] = useState(false);
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsStuck(entry ? !entry.isIntersecting : false),
			{ root: scrollRef.current, rootMargin: "-12px 0px 0px 0px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [scrollRef, sentinelRef]);
	return isStuck;
}

export { Toolbar, ToolbarDivider, ToolbarGroup, ToolbarSpacer };
