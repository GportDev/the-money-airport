import { Skeleton, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function TransactionFeedSkeleton({ label = "Loading transactions" }: { label?: string }) {
	return (
		<SkeletonGroup label={label} className="flex flex-col gap-3">
			<Skeleton className="h-4 w-36" />
			<SkeletonRows count={6} />
		</SkeletonGroup>
	);
}
