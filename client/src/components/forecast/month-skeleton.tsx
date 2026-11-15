import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function MonthSkeleton() {
	return (
		<SkeletonGroup label="Loading forecast month" className="flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				{["opening", "low", "closing"].map((stat) => (
					<SkeletonCard key={stat}>
						<Skeleton className="h-7 w-28" />
					</SkeletonCard>
				))}
			</div>
			<SkeletonCard>
				<Skeleton className="h-48 w-full" />
			</SkeletonCard>
			<SkeletonRows count={4} />
		</SkeletonGroup>
	);
}
