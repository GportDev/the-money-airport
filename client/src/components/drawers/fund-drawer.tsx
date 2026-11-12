import { useState } from "react";
import { FundEntryForm } from "@/components/goals/fund-entry-form";
import { FundEntryList } from "@/components/goals/fund-entry-list";
import { Amount } from "@/components/ui/amount";
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
				<div className="flex gap-2 px-4">
					<button
						type="button"
						aria-expanded={isFormOpen}
						onClick={() => setFormOpen((value) => !value)}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					>
						Add entry
					</button>
					<button
						type="button"
						onClick={() => {
							close();
							onEdit();
						}}
						className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
					>
						Edit goal
					</button>
				</div>
				{isFormOpen ? <FundEntryForm goalId={goal.id} onDone={() => setFormOpen(false)} /> : null}
				<FundEntryList
					goalId={goal.id}
					entries={entries.data ?? []}
					currency={hostCurrency}
					isLoading={entries.isPending}
					hasError={entries.isError}
				/>
			</SheetContent>
		</Sheet>
	);
}
