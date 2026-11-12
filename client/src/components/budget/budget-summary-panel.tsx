import { Tabs } from "radix-ui";
import { useSearchParams } from "react-router";
import { BudgetBar } from "@/components/budget/budget-bar";
import { Amount } from "@/components/ui/amount";
import { useBudgetMonth } from "@/hooks/use-budgets";
import { BUDGET_GROUP_LABELS, isOverBudget } from "@/lib/budget";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { parseMonth } from "@/lib/month";
import type { BudgetMonth } from "@/types";

const TABS = [
	{ value: "summary", label: "Summary" },
	{ value: "income", label: "Income" },
	{ value: "expenses", label: "Expenses" },
] as const;

export function BudgetSummaryPanel() {
	const [searchParams] = useSearchParams();
	const { year, month } = parseMonth(searchParams.get("month"));
	const budget = useBudgetMonth(year, month);

	if (budget.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load the budget summary.
			</p>
		);
	}
	if (!budget.data) {
		return <p className="text-sm text-muted-foreground">Loading…</p>;
	}
	return <PanelBody data={budget.data} />;
}

function PanelBody({ data }: { data: BudgetMonth }) {
	const currency = data.baseCurrency;
	const isOver = data.leftToBudget < 0;
	const income = data.groups.find((group) => group.key === "income");
	const expenses = data.groups.filter((group) => group.key !== "income");
	const expensePlanned = expenses.reduce((sum, group) => sum + group.planned, 0);
	const expenseActual = expenses.reduce((sum, group) => sum + group.actual, 0);

	return (
		<div className="flex flex-col gap-5">
			<output
				aria-label="Left to budget"
				className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
			>
				<Amount className={cn("text-3xl font-semibold", isOver && "text-negative")}>
					{formatMoney(Math.abs(data.leftToBudget), currency)}
				</Amount>
				<span className="text-sm text-muted-foreground">
					{isOver ? "Over budget" : "Left to budget"}
				</span>
			</output>
			<Tabs.Root defaultValue="summary" className="flex flex-col gap-4">
				<Tabs.List
					aria-label="Budget summary"
					className="flex rounded-md border border-border p-0.5"
				>
					{TABS.map((tab) => (
						<Tabs.Trigger
							key={tab.value}
							value={tab.value}
							className="flex-1 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-muted data-[state=active]:font-medium data-[state=active]:text-foreground"
						>
							{tab.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>
				<Tabs.Content value="summary">
					<ul className="flex flex-col gap-4">
						<BudgetBar
							label="Income"
							planned={income?.planned ?? 0}
							actual={income?.actual ?? 0}
							isOver={false}
							currency={currency}
						/>
						<BudgetBar
							label="Expenses"
							planned={expensePlanned}
							actual={expenseActual}
							isOver={expenseActual > expensePlanned}
							currency={currency}
						/>
					</ul>
				</Tabs.Content>
				<Tabs.Content value="income">
					{income && income.categories.length > 0 ? (
						<ul className="flex flex-col gap-4">
							{income.categories.map((row) => (
								<BudgetBar
									key={row.categoryId}
									label={row.categoryName}
									planned={row.planned}
									actual={row.actual}
									isOver={false}
									currency={currency}
								/>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">No income planned this month.</p>
					)}
				</Tabs.Content>
				<Tabs.Content value="expenses">
					<ul className="flex flex-col gap-4">
						{expenses.map((group) => (
							<BudgetBar
								key={group.key}
								label={BUDGET_GROUP_LABELS[group.key]}
								planned={group.planned}
								actual={group.actual}
								isOver={isOverBudget(group.key, group.planned, group.actual)}
								currency={currency}
							/>
						))}
					</ul>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	);
}
