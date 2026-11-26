import { useState } from "react";
import { FundEntryForm } from "@/components/goals/fund-entry-form";
import { FundEntryList } from "@/components/goals/fund-entry-list";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useFundEntries } from "@/hooks/use-goals";
import { formatMoney } from "@/lib/format";
import { formatPercent } from "@/lib/goals";
import type { Goal } from "@/types";

type Props = {
	goal: Goal;
	currency: string;
	onEdit: () => void;
	onClose: () => void;
};

export function FundDrawer({ goal, currency, onEdit, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const entries = useFundEntries(goal.id);
	const [isFormOpen, setFormOpen] = useState(false);
	const hostCurrency = goal.host?.isoCurrencyCode ?? currency;

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{goal.name}</SheetTitle>
					<SheetDescription>Fund in {goal.host?.name ?? "its host account"}</SheetDescription>
					<output aria-label="Fund balance" className="pt-2 text-2xl font-semibold">
						<Amount>{formatMoney(goal.fundBalance ?? 0, hostCurrency)}</Amount>
					</output>
					<Progress value={goal.percentComplete * 100} aria-label={`${goal.name} progress`} />
					<p className="text-sm text-muted-foreground">
						{formatPercent(goal.percentComplete)} of {formatMoney(goal.targetAmount, currency)}
					</p>
				</SheetHeader>
				<Collapsible open={isFormOpen} onOpenChange={setFormOpen}>
					<div className="flex gap-2 px-4">
						<CollapsibleTrigger asChild>
							<Button type="button">Add entry</Button>
						</CollapsibleTrigger>
						<Button
							variant="outline"
							type="button"
							onClick={() => {
								close();
								onEdit();
							}}
						>
							Edit goal
						</Button>
					</div>
					<CollapsibleContent>
						<FundEntryForm goalId={goal.id} onDone={() => setFormOpen(false)} />
					</CollapsibleContent>
				</Collapsible>
				<FundEntryList
					goalId={goal.id}
					entries={entries.data ?? []}
					currency={hostCurrency}
					isLoading={entries.isPending}
					hasError={entries.isError}
					isRetrying={entries.isFetching}
					onRetry={() => void entries.refetch()}
				/>
			</SheetContent>
		</Sheet>
	);
}
