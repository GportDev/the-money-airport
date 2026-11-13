import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function NoMatchingTransactions({ onClear }: { onClear: () => void }) {
	return (
		<EmptyState
			icon={SearchX}
			title="No transactions match these filters."
			description="Try a different search, or clear the filters to see everything."
			action={
				<button
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					type="button"
					onClick={onClear}
				>
					Clear filters
				</button>
			}
		/>
	);
}
