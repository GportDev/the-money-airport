import { Skeleton, SkeletonCard, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

export function CreditCardsSkeleton() {
	return (
		<SkeletonGroup
			label="Loading credit cards"
			className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start"
		>
			<div className="flex flex-col gap-3">
				{["first", "second"].map((tile) => (
					<SkeletonCard key={tile}>
						<Skeleton className="h-8 w-36" />
						<Skeleton className="h-2 w-full" />
						<Skeleton className="h-16 w-full" />
					</SkeletonCard>
				))}
			</div>
			<div className="flex flex-col gap-4">
				<SkeletonCard>
					<Skeleton className="h-9 w-64" />
					<Skeleton className="h-28 w-full" />
				</SkeletonCard>
				<SkeletonRows count={3} />
			</div>
		</SkeletonGroup>
	);
}
