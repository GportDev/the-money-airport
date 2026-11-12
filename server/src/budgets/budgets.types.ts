export type BudgetGroupKey = "income" | "fixed" | "flexible" | "non_monthly";

export type BudgetDto = {
	id: string;
	categoryId: string;
	/** First day of the month, YYYY-MM-DD. */
	month: string;
	amount: number;
};

export type BudgetCategoryRow = {
	/** Budget id; null when the Category has no plan this month. */
	id: string | null;
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	categoryColor: string;
	group: BudgetGroupKey;
	planned: number;
	actual: number;
	/** Income: actual − planned. Expense: planned − actual. */
	remaining: number;
	/** actual / planned as a 0-1+ ratio; 0 when nothing is planned. */
	percentUsed: number;
};

export type BudgetGroupSummary = {
	key: BudgetGroupKey;
	planned: number;
	/** Every Category in the group, planned or not, so it matches the Dashboard widget. */
	actual: number;
	remaining: number;
	/** Planned Categories only. */
	categories: BudgetCategoryRow[];
};

export type BudgetMonth = {
	/** YYYY-MM */
	month: string;
	baseCurrency: string;
	/** Income planned − expense planned. */
	leftToBudget: number;
	groups: BudgetGroupSummary[];
	/** Every Category without a plan this month, biggest actual first. */
	unbudgeted: BudgetCategoryRow[];
	/** Currencies with no FX rate into Base currency; their amounts are left out. */
	omittedCurrencies: string[];
};
