import { BrandMark } from "@/components/brand/brand-mark";
import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";
import { NAV_ITEMS } from "@/lib/constants";

/** The app frame while the first session check runs, so a cold server never shows a blank page. */
export function AppShellSkeleton() {
	return (
		<SkeletonGroup
			label="Loading Money Airport"
			className="flex h-svh overflow-hidden bg-background font-sans"
		>
			<div className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-card desk:w-42">
				<div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3.75">
					<BrandMark className="shrink-0" />
					<Skeleton className="hidden h-3.5 w-20 desk:block" />
				</div>
				<div className="flex flex-col gap-1 p-2">
					{NAV_ITEMS.map((item) => (
						<div key={item.path} className="flex items-center gap-2 px-3.75 py-2.5">
							<Skeleton className="size-4 shrink-0 rounded" />
							<Skeleton className="hidden h-3 flex-1 desk:block" />
						</div>
					))}
				</div>
			</div>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="h-14 shrink-0 border-b border-border" />
				<div className="flex flex-col gap-4 p-6">
					<Skeleton className="h-7 w-40" />
					<SkeletonCard />
					<SkeletonRows count={5} />
				</div>
			</div>
		</SkeletonGroup>
	);
}
