export type CategoryKind = "income" | "expense";
export type BudgetGroup = "fixed" | "flexible" | "non_monthly";

export const UNCATEGORIZED = "Uncategorized";
export const SAVINGS_TRANSFER = "Savings Transfer";

type Seed = {
	name: string;
	icon: string;
	color: string;
	kind: CategoryKind;
	budgetGroup: BudgetGroup | null;
	isUncategorized?: boolean;
};

export const DEFAULT_CATEGORIES: Seed[] = [
	{ name: "Housing", icon: "house", color: "#8B5CF6", kind: "expense", budgetGroup: "fixed" },
	{ name: "Utilities", icon: "zap", color: "#F59E0B", kind: "expense", budgetGroup: "fixed" },
	{ name: "Insurance", icon: "shield", color: "#0EA5E9", kind: "expense", budgetGroup: "fixed" },
	{
		name: "Debt Payment",
		icon: "credit-card",
		color: "#EF4444",
		kind: "expense",
		budgetGroup: "fixed",
	},
	{
		name: "Groceries",
		icon: "shopping-cart",
		color: "#22C55E",
		kind: "expense",
		budgetGroup: "flexible",
	},
	{ name: "Transport", icon: "car", color: "#3B82F6", kind: "expense", budgetGroup: "flexible" },
	{ name: "Dining", icon: "utensils", color: "#F97316", kind: "expense", budgetGroup: "flexible" },
	{
		name: "Entertainment",
		icon: "film",
		color: "#EC4899",
		kind: "expense",
		budgetGroup: "flexible",
	},
	{
		name: "Shopping",
		icon: "shopping-bag",
		color: "#A855F7",
		kind: "expense",
		budgetGroup: "flexible",
	},
	{
		name: "Healthcare",
		icon: "heart-pulse",
		color: "#14B8A6",
		kind: "expense",
		budgetGroup: "flexible",
	},
	{
		name: "Subscriptions",
		icon: "repeat",
		color: "#6366F1",
		kind: "expense",
		budgetGroup: "flexible",
	},
	{ name: "Giving", icon: "gift", color: "#E11D48", kind: "expense", budgetGroup: "flexible" },
	{
		name: "Education",
		icon: "graduation-cap",
		color: "#0891B2",
		kind: "expense",
		budgetGroup: "non_monthly",
	},
	{
		name: SAVINGS_TRANSFER,
		icon: "piggy-bank",
		color: "#10B981",
		kind: "expense",
		budgetGroup: "non_monthly",
	},
	{ name: "Salary", icon: "briefcase", color: "#16A34A", kind: "income", budgetGroup: null },
	{
		name: UNCATEGORIZED,
		icon: "circle-question-mark",
		color: "#6B7280",
		kind: "expense",
		budgetGroup: "non_monthly",
		isUncategorized: true,
	},
];

// Plaid personal_finance_category detailed codes win over primary codes.
const BY_DETAILED: Record<string, string> = {
	FOOD_AND_DRINK_GROCERIES: "Groceries",
	RENT_AND_UTILITIES_RENT: "Housing",
	GENERAL_SERVICES_INSURANCE: "Insurance",
	GENERAL_SERVICES_EDUCATION: "Education",
	GOVERNMENT_AND_NON_PROFIT_DONATIONS: "Giving",
	ENTERTAINMENT_TV_AND_MOVIES: "Subscriptions",
	ENTERTAINMENT_MUSIC_AND_AUDIO: "Subscriptions",
	TRANSFER_OUT_SAVINGS: SAVINGS_TRANSFER,
};

const BY_PRIMARY: Record<string, string> = {
	INCOME: "Salary",
	LOAN_PAYMENTS: "Debt Payment",
	ENTERTAINMENT: "Entertainment",
	FOOD_AND_DRINK: "Dining",
	GENERAL_MERCHANDISE: "Shopping",
	HOME_IMPROVEMENT: "Housing",
	MEDICAL: "Healthcare",
	PERSONAL_CARE: "Healthcare",
	TRANSPORTATION: "Transport",
	TRAVEL: "Transport",
	RENT_AND_UTILITIES: "Utilities",
};

/** Best-effort seeded Category name for a Plaid category, or null for Uncategorized. */
export function categoryNameForPlaid(primary: string | null, detailed: string | null) {
	if (detailed && BY_DETAILED[detailed]) {
		return BY_DETAILED[detailed];
	}
	if (primary && BY_PRIMARY[primary]) {
		return BY_PRIMARY[primary];
	}
	return null;
}
