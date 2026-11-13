import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";

type Props = {
	icon: LucideIcon;
	title: string;
	description: string;
	/** The one primary call to action. */
	action: ReactNode;
	className?: string;
	children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action, className, children }: Props) {
	const headingId = useId();
	return (
		<section
			aria-labelledby={headingId}
			className={cn(
				"flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center",
				className,
			)}
		>
			<span className="flex size-12 items-center justify-center rounded-full bg-muted">
				<Icon aria-hidden className="size-6 text-muted-foreground" />
			</span>
			<div>
				<h2 id={headingId} className="font-medium">
					{title}
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			{action}
			{children}
		</section>
	);
}
