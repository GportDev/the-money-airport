import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { monthName: string; previousName: string; onCopyPrevious: () => void };

export function NoBudgetPlans({ monthName, previousName, onCopyPrevious }: Props) {
	return (
		<EmptyState
			icon={Wallet}
			title={`No plans for ${monthName}`}
			description="Copy last month's plans, or set an amount on any category below."
			action={
				<button
					type="button"
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					onClick={onCopyPrevious}
				>
					Copy from {previousName}
				</button>
			}
		/>
	);
}
