import { SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function RecurringSkeleton() {
	return (
		<SkeletonGroup label="Loading recurring">
			<SkeletonRows count={4} />
		</SkeletonGroup>
	);
}
