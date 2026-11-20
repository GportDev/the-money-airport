import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Router errorElement: a page that crashed while rendering or loading. */
export function RouteError() {
	return (
		<EmptyState
			icon={TriangleAlert}
			title="Something went wrong"
			description="This page hit an error. Reload to try again; your data is safe."
			action={
				<Button type="button" onClick={() => window.location.reload()}>
					Reload page
				</Button>
			}
		/>
	);
}
