import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
				"flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-negative/5 px-3 py-2 text-sm text-negative",
				className,
			)}
		>
			<span>{message}</span>
			<Button variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
				<RotateCw aria-hidden className={cn("size-3.5", isRetrying && "animate-spin")} />
				Try again
			</Button>
		</div>
	);
}
