import { Skeleton, SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

export function CashFlowSkeleton() {
	return (
		<SkeletonGroup label="Loading cash flow" className="mb-6 flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-3">
				{["income", "expenses", "net"].map((kpi) => (
					<SkeletonCard key={kpi}>
						<Skeleton className="h-7 w-28" />
					</SkeletonCard>
				))}
			</div>
			<SkeletonCard>
				<Skeleton className="h-64 w-full" />
			</SkeletonCard>
		</SkeletonGroup>
	);
}
