import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { monthName: string; previousName: string; onCopyPrevious: () => void };

export function NoBudgetPlans({ monthName, previousName, onCopyPrevious }: Props) {
	return (
		<EmptyState
			icon={Wallet}
			title={`No plans for ${monthName}`}
			description="Copy last month's plans, or set an amount on any category below."
			action={
				<Button type="button" onClick={onCopyPrevious}>
					Copy from {previousName}
				</Button>
			}
		/>
	);
}
