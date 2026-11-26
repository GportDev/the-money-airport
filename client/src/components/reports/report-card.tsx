import { type ReactNode, useId } from "react";
import { CardInfo } from "@/components/ui/card";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useSettleClass } from "@/hooks/use-settle-class";
import { cn } from "@/lib/cn";
import type { ReportStatus } from "@/lib/report-status";

type Props = {
	title: string;
	/** One sentence on what the report counts, shown behind an info icon. */
	info?: string;
	status: ReportStatus;
	emptyMessage: string;
	/** Currencies left out of the totals for want of an FX rate. */
	omittedCurrencies?: string[];
	onRetry: () => void;
	className?: string;
	children: ReactNode;
};

export function ReportCard({
	title,
	info,
	status,
	emptyMessage,
	omittedCurrencies = [],
	onRetry,
	className,
	children,
}: Props) {
	const headingId = useId();
	const settle = useSettleClass(status === "loading");
	return (
		<section
			aria-labelledby={headingId}
			className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-5", className)}
		>
			<div className="flex items-center gap-1">
				<h2 id={headingId} className="text-[15px] font-semibold">
					{title}
				</h2>
				{info ? <CardInfo label={`About ${title}`}>{info}</CardInfo> : null}
			</div>
			{status === "ready" ? (
				<div className={cn("flex flex-col gap-3", settle)}>
					{children}
					{omittedCurrencies.length > 0 ? (
						<p className="text-xs text-muted-foreground">
							Left out (no exchange rate): {omittedCurrencies.join(", ")}.
						</p>
					) : null}
				</div>
			) : status === "error" ? (
				<QueryError message="Could not load this report." onRetry={onRetry} />
			) : status === "loading" ? (
				<SkeletonGroup label={`Loading ${title}`}>
					<Skeleton className="h-48 w-full" />
				</SkeletonGroup>
			) : (
				<p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
			)}
		</section>
	);
}
