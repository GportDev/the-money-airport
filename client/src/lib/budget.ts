import type { BudgetMonthGroupKey } from "@/types";

export const BUDGET_GROUP_LABELS: Record<BudgetMonthGroupKey, string> = {
	income: "Income",
	fixed: "Fixed",
	flexible: "Flexible",
	non_monthly: "Non-Monthly",
};

/** Over plan means short of income, or spent past the expense plan. */
export function isOverBudget(group: BudgetMonthGroupKey, planned: number, actual: number) {
	if (group === "income") {
		return false;
	}
	return actual > planned;
}
