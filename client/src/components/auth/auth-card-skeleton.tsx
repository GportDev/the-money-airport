import { BrandLockup } from "@/components/brand/brand-lockup";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

/** The log in card's shape while the first session check runs on a cold server. */
export function AuthCardSkeleton() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-6">
			<SkeletonGroup label="Loading Money Airport" className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<BrandLockup />
						<Skeleton className="h-7 w-24" />
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
					</CardContent>
				</Card>
			</SkeletonGroup>
		</div>
	);
}
