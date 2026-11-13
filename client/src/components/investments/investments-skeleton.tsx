import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function InvestmentsSkeleton() {
	return (
		<SkeletonGroup label="Loading investments" className="flex flex-col gap-4">
			<div className="grid gap-4 lg:grid-cols-2">
				<SkeletonCard>
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-32 w-full" />
				</SkeletonCard>
				<SkeletonCard>
					<Skeleton className="mx-auto size-40 rounded-full" />
				</SkeletonCard>
			</div>
			<SkeletonRows count={3} />
		</SkeletonGroup>
	);
}
