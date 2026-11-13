import { SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

const CARDS = ["spending", "income", "top", "net"];

export function ReportsSkeleton() {
	return (
		<SkeletonGroup label="Loading reports" className="grid gap-4 lg:grid-cols-2">
			{CARDS.map((card) => (
				<SkeletonCard key={card} className="h-72" />
			))}
			<SkeletonCard className="h-72 lg:col-span-2" />
		</SkeletonGroup>
	);
}
