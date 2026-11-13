import { Skeleton, SkeletonCard, SkeletonGroup } from "@/components/ui/skeleton";

const SECTIONS = ["dashboard", "budget", "currency"];

export function SettingsSkeleton() {
	return (
		<SkeletonGroup label="Loading settings" className="flex flex-col gap-4">
			{SECTIONS.map((section) => (
				<SkeletonCard key={section} className="p-6">
					<Skeleton className="h-9 w-48" />
				</SkeletonCard>
			))}
		</SkeletonGroup>
	);
}
