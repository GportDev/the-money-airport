import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
	return (
		<SkeletonGroup label="Loading dashboard" className="grid gap-4 xl:grid-cols-2">
			<div className="flex flex-col gap-4">
				<SkeletonCard>
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
				</SkeletonCard>
				<SkeletonCard>
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-32 w-full" />
				</SkeletonCard>
			</div>
			<div className="flex flex-col gap-4">
				<SkeletonCard>
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-32 w-full" />
				</SkeletonCard>
				<SkeletonCard>
					<SkeletonRows count={4} />
				</SkeletonCard>
			</div>
		</SkeletonGroup>
	);
}
