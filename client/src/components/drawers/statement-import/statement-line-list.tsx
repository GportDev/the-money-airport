import type * as React from "react";

type Props = {
	title: string;
	hint: string;
	count: number;
	children: React.ReactNode;
};

/** One group of the import preview: Matched, New, or Not on statement. Hidden when empty. */
export function StatementLineList({ title, hint, count, children }: Props) {
	if (count === 0) return null;
	return (
		<section className="flex flex-col gap-1.5 text-sm">
			<h3 className="flex items-baseline justify-between font-medium">
				{title} <span className="text-xs font-normal text-muted-foreground">{count}</span>
			</h3>
			<p className="text-xs text-muted-foreground">{hint}</p>
			<ul aria-label={title} className="divide-y divide-border rounded-lg border border-border">
				{children}
			</ul>
		</section>
	);
}
