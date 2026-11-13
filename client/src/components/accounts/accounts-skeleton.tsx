import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function AccountsSkeleton() {
	return (
		<SkeletonGroup label="Loading accounts" className="flex flex-col gap-6">
			<SkeletonCard className="p-6">
				<Skeleton className="h-9 w-48" />
				<Skeleton className="h-24 w-full" />
			</SkeletonCard>
			{["cash", "credit"].map((group) => (
				<div key={group} className="flex flex-col gap-2">
					<Skeleton className="h-4 w-28" />
					<SkeletonRows count={2} />
				</div>
			))}
		</SkeletonGroup>
	);
}
