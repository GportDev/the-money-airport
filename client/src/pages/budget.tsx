import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { BudgetColumnLabels } from "@/components/budget/budget-column-labels";
import { BudgetGroup } from "@/components/budget/budget-group";
import { BudgetSettingsMenu } from "@/components/budget/budget-settings-menu";
import { UnbudgetedList } from "@/components/budget/unbudgeted-list";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BudgetCategoryDrawer } from "@/components/drawers/budget-category-drawer";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/layout/page-header";
import { useBudgetMonth, useCopyPreviousBudget } from "@/hooks/use-budgets";
import { useUpdateSettings } from "@/hooks/use-dashboard";
import { useSettings } from "@/hooks/use-settings";
import { monthLabel, monthStart, parseMonth, shiftMonth } from "@/lib/month";
import type { BudgetCategoryRow } from "@/types";

export function BudgetPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { year, month } = parseMonth(searchParams.get("month"));
	const isUnbudgetedShown = searchParams.get("unbudgeted") === "show";
	const budget = useBudgetMonth(year, month);
	const settings = useSettings();
	const updateSettings = useUpdateSettings();
	const copyPrevious = useCopyPreviousBudget();
	const [openRow, setOpenRow] = useState<BudgetCategoryRow | null>(null);
	const [isCopyConfirmOpen, setCopyConfirmOpen] = useState(false);

	const [previousYear, previousMonth] = shiftMonth(year, month, -1).split("-").map(Number);
	const previousName = monthLabel(previousYear ?? year, previousMonth ?? month, "month");
	const data = budget.data;
	const currency = data?.baseCurrency ?? "USD";

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
	}

	async function onCopyPrevious() {
		setCopyConfirmOpen(false);
		try {
			const created = await copyPrevious.mutateAsync(monthStart(year, month));
			if (created.length === 0) {
				toast.info(`Nothing to copy from ${previousName}`);
				return;
			}
			toast.success(
				`Copied ${created.length} plan${created.length === 1 ? "" : "s"} from ${previousName}`,
			);
		} catch (_error) {
			toast.error("Could not copy plans");
		}
	}

	async function onCopyForwardChange(next: boolean) {
		try {
			await updateSettings.mutateAsync({ budgetCopyForward: next });
			toast.success(next ? "Copy forward on" : "Copy forward off");
		} catch (_error) {
			toast.error("Could not update copy forward");
		}
	}

	return (
		<>
			<PageHeader title="Budget">
				<MonthNavigator
					year={year}
					month={month}
					onShift={(delta) =>
						patchParams((next) => next.set("month", shiftMonth(year, month, delta)))
					}
				/>
				<BudgetSettingsMenu
					isCopyForward={settings.data?.budgetCopyForward ?? false}
					onCopyPrevious={() => setCopyConfirmOpen(true)}
					onCopyForwardChange={(next) => void onCopyForwardChange(next)}
				/>
			</PageHeader>

			{budget.isError ? (
				<p role="alert" className="mb-4 text-sm text-negative">
					Could not load the budget.
				</p>
			) : null}
			{data && data.omittedCurrencies.length > 0 ? (
				<output className="mb-4 block rounded-md border border-border bg-muted px-3 py-2 text-sm">
					Left out of actuals (no exchange rate into {currency}):{" "}
					{data.omittedCurrencies.join(", ")}.
				</output>
			) : null}

			{data ? (
				<div className="flex flex-col gap-4">
					<BudgetColumnLabels />
					{data.groups
						.filter((group) => group.key === "income")
						.map((group) => (
							<BudgetGroup key={group.key} group={group} currency={currency} onOpen={setOpenRow} />
						))}
					<section aria-labelledby="budget-expenses-heading" className="flex flex-col gap-3">
						<h2 id="budget-expenses-heading" className="text-sm font-medium text-muted-foreground">
							Expenses
						</h2>
						{data.groups
							.filter((group) => group.key !== "income")
							.map((group) => (
								<BudgetGroup
									key={group.key}
									group={group}
									currency={currency}
									onOpen={setOpenRow}
								/>
							))}
					</section>
					<button
						type="button"
						aria-pressed={isUnbudgetedShown}
						className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
						onClick={() =>
							patchParams((next) => {
								if (isUnbudgetedShown) next.delete("unbudgeted");
								else next.set("unbudgeted", "show");
							})
						}
					>
						{isUnbudgetedShown ? "Hide unbudgeted" : "Show unbudgeted"}
					</button>
					{isUnbudgetedShown ? (
						<UnbudgetedList rows={data.unbudgeted} currency={currency} onOpen={setOpenRow} />
					) : null}
				</div>
			) : budget.isPending ? (
				<p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
			) : null}

			{openRow ? (
				<BudgetCategoryDrawer
					key={openRow.categoryId}
					row={openRow}
					month={monthStart(year, month)}
					monthName={monthLabel(year, month)}
					currency={currency}
					onClose={() => setOpenRow(null)}
				/>
			) : null}
			{isCopyConfirmOpen ? (
				<ConfirmDialog
					title={`Copy ${previousName} plans into ${monthLabel(year, month)}? Existing plans stay.`}
					confirmLabel="Copy"
					onCancel={() => setCopyConfirmOpen(false)}
					onConfirm={() => void onCopyPrevious()}
				/>
			) : null}
		</>
	);
}
