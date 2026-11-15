import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function DebtSkeleton() {
	return (
		<SkeletonGroup label="Loading debt plan" className="flex flex-col gap-4">
			<SkeletonCard>
				<Skeleton className="h-9 w-48" />
				<Skeleton className="h-3 w-1/3" />
			</SkeletonCard>
			<SkeletonCard>
				<Skeleton className="h-48 w-full" />
			</SkeletonCard>
			<SkeletonRows count={3} />
		</SkeletonGroup>
	);
}
