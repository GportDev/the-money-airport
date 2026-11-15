import { Skeleton, SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

export function YearSkeleton() {
	return (
		<SkeletonGroup label="Loading forecast" className="flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				{["income", "spending", "closing"].map((stat) => (
					<SkeletonCard key={stat}>
						<Skeleton className="h-7 w-28" />
					</SkeletonCard>
				))}
			</div>
			<SkeletonCard>
				<Skeleton className="h-56 w-full" />
			</SkeletonCard>
			{["revenue", "fixed", "variable"].map((section) => (
				<SkeletonCard key={section}>
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</SkeletonCard>
			))}
		</SkeletonGroup>
	);
}
