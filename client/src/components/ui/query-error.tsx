import { RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
	message: string;
	onRetry: () => void;
	isRetrying?: boolean;
	className?: string;
};

export function QueryError({ message, onRetry, isRetrying = false, className }: Props) {
	return (
		<div
			role="alert"
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 rounded-md border border-negative/30 bg-negative/5 px-3 py-2 text-sm text-negative",
				className,
			)}
		>
			<span>{message}</span>
			<button
				type="button"
				disabled={isRetrying}
				onClick={onRetry}
				className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				<RotateCw aria-hidden className={cn("size-3.5", isRetrying && "animate-spin")} />
				Try again
			</button>
		</div>
	);
}
