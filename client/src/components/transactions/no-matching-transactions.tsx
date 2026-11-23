import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function NoMatchingTransactions({ onClear }: { onClear: () => void }) {
	return (
		<EmptyState
			icon={SearchX}
			title="No transactions match these filters."
			description="Try a different search, or clear the filters to see everything."
			action={
				<Button type="button" onClick={onClear}>
					Clear filters
				</Button>
			}
		/>
	);
}
