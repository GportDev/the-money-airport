import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import type { ReportStatus } from "@/lib/report-status";

type Props = {
	title: string;
	status: ReportStatus;
	emptyMessage: string;
	/** Currencies left out of the totals for want of an FX rate. */
	omittedCurrencies?: string[];
	className?: string;
	children: ReactNode;
};

export function ReportCard({
	title,
	status,
	emptyMessage,
	omittedCurrencies = [],
	className,
	children,
}: Props) {
	const headingId = useId();
	return (
		<section
			aria-labelledby={headingId}
			className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)}
		>
			<h2 id={headingId} className="text-sm font-medium text-muted-foreground">
				{title}
			</h2>
			{status === "ready" ? (
				<>
					{children}
					{omittedCurrencies.length > 0 ? (
						<p className="text-xs text-muted-foreground">
							Left out (no exchange rate): {omittedCurrencies.join(", ")}.
						</p>
					) : null}
				</>
			) : status === "error" ? (
				<p role="alert" className="py-10 text-center text-sm text-negative">
					Could not load this report.
				</p>
			) : (
				<p className="py-10 text-center text-sm text-muted-foreground">
					{status === "loading" ? "Loading…" : emptyMessage}
				</p>
			)}
		</section>
	);
}
