import { Skeleton, SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

export function GoalsSkeleton() {
	return (
		<SkeletonGroup label="Loading goals" className="flex flex-col gap-3">
			{["first", "second", "third"].map((goal) => (
				<SkeletonCard key={goal}>
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-3 w-1/3" />
				</SkeletonCard>
			))}
		</SkeletonGroup>
	);
}
