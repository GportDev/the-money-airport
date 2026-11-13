import { Skeleton, SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

const GROUPS = ["income", "fixed", "flexible", "non_monthly"];

export function BudgetSkeleton() {
	return (
		<SkeletonGroup label="Loading budget" className="flex flex-col gap-4">
			{GROUPS.map((group) => (
				<SkeletonCard key={group}>
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</SkeletonCard>
			))}
		</SkeletonGroup>
	);
}
