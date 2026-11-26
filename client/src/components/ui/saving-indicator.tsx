import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** A small spinner that only fades in after 150ms, so fast saves never flash it. */
export function SavingIndicator({ className }: { className?: string }) {
	return (
		<Loader2
			role="status"
			aria-label="Saving"
			className={cn(
				"size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none",
				"[animation:spin_1s_linear_infinite,fade-in_120ms_var(--ease-out)_150ms_backwards]",
				className,
			)}
		/>
	);
}
