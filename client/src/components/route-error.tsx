import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Router errorElement: a page that crashed while rendering or loading. */
export function RouteError() {
	return (
		<EmptyState
			icon={TriangleAlert}
			title="Something went wrong"
			description="This page hit an error. Reload to try again; your data is safe."
			action={
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
				>
					Reload page
				</button>
			}
		/>
	);
}
