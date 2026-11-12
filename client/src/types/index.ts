export const DISPLAY_GROUPS = [
	{ key: "cash", label: "Cash" },
	{ key: "credit", label: "Credit Cards" },
	{ key: "investment", label: "Investments" },
	{ key: "loan", label: "Loans" },
	{ key: "vehicle", label: "Vehicles" },
	{ key: "other", label: "Other" },
] as const;

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number]["key"];

export type BankAccount = {
	id: string;
	name: string;
	officialName: string | null;
	displayGroup: DisplayGroup;
	type: string;
	mask: string | null;
	currentBalance: number;
	availableBalance: number | null;
	creditLimit: number | null;
	isAsset: boolean;
	institutionName: string | null;
	institutionLogo: string | null;
	lastSyncedAt: string | null;
	source: "plaid" | "manual";
	isoCurrencyCode: string;
	isHidden: boolean;
	apyBps: number | null;
	funds: FundSummary[];
	unassigned: number | null;
	plaidItemId?: string | null;
	plaidItemStatus: string | null;
	errorCode: string | null;
	sparkline: { date: string; value: number }[];
};

export type GroupSummary = {
	group: DisplayGroup;
	total: number;
	change: number;
};

export type NetWorth = {
	current: number;
	change: number;
	changePercent: number;
	baseCurrency: string;
	series: { date: string; value: number }[];
	assets: { group: string; total: number }[];
	liabilities: { group: string; total: number }[];
	groups: GroupSummary[];
};

export type CategoryKind = "income" | "expense";
export type BudgetGroup = "fixed" | "flexible" | "non_monthly";

export type Category = {
	id: string;
	name: string;
	color: string;
	icon: string;
	kind: CategoryKind;
	budgetGroup: BudgetGroup | null;
	isDefault: boolean;
	isUncategorized: boolean;
};

export type TransferTag = "transfer" | "savings_transfer";

export type TransactionListItem = {
	id: string;
	date: string;
	name: string;
	merchantName: string | null;
	merchantLogoUrl: string | null;
	amount: number;
	isoCurrencyCode: string;
	pending: boolean;
	isManual: boolean;
	tags: string[];
	category: { id: string; name: string; icon: string; color: string } | null;
	account: {
		id: string;
		name: string;
		mask: string | null;
		institutionLogo: string | null;
	} | null;
};

export type TransactionDetail = TransactionListItem & {
	notes: string | null;
	plaidPfcPrimary: string | null;
	fundEntry: { id: string; goalId: string; goalName: string } | null;
	similar: TransactionListItem[];
};

export type TransactionPage = {
	data: TransactionListItem[];
	meta: { nextCursor: string | null; limit: number };
};

export type TransactionFilters = {
	dateFrom?: string;
	dateTo?: string;
	accountIds?: string[];
	categoryIds?: string[];
	search?: string;
	pending?: boolean;
	amountMin?: number;
	amountMax?: number;
};

export type RunningBalanceKind = "net_worth" | "balance" | "owed";

export type CashFlowDay = {
	day: number;
	date: string;
	income: number;
	expenses: number;
	net: number;
	runningBalance: number | null;
};

export type CashFlow = {
	year: number;
	month: number;
	baseCurrency: string;
	accountId: string | null;
	runningBalanceKind: RunningBalanceKind;
	summary: { totalIncome: number; totalExpenses: number; netCashFlow: number };
	daily: CashFlowDay[];
	omittedCurrencies: string[];
};

export const DASHBOARD_WIDGET_IDS = [
	"budget",
	"net_worth",
	"spending",
	"transactions",
	"recurring",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidget = { id: DashboardWidgetId; visible: boolean; order: number };

export type UserSettings = {
	currency: string;
	dashboardWidgets: DashboardWidget[];
	budgetCopyForward: boolean;
};

export type BudgetGroupKey = "fixed" | "flexible" | "non_monthly";

export type NetWorthRange = "1m" | "3m" | "1y" | "ytd";

export type Dashboard = {
	month: string;
	baseCurrency: string;
	greetingName: string;
	hasAccounts: boolean;
	widgets: DashboardWidget[];
	budget: {
		hasBudget: boolean;
		groups: { key: BudgetGroupKey; planned: number; spent: number; remaining: number }[];
	} | null;
	netWorth: {
		range: NetWorthRange;
		current: number;
		change: number;
		changePercent: number;
		series: { date: string; value: number }[];
	} | null;
	spending: {
		total: number;
		thisMonth: { day: number; amount: number }[];
		lastMonth: { day: number; amount: number }[];
	} | null;
	transactions: TransactionListItem[] | null;
	recurring: { remainingDue: number; upcoming: never[] } | null;
};

export type BudgetMonthGroupKey = "income" | BudgetGroupKey;

export type Budget = { id: string; categoryId: string; month: string; amount: number };

export type BudgetCategoryRow = {
	id: string | null;
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	categoryColor: string;
	group: BudgetMonthGroupKey;
	planned: number;
	actual: number;
	remaining: number;
	percentUsed: number;
};

export type BudgetGroupSummary = {
	key: BudgetMonthGroupKey;
	planned: number;
	actual: number;
	remaining: number;
	categories: BudgetCategoryRow[];
};

export type BudgetMonth = {
	month: string;
	baseCurrency: string;
	leftToBudget: number;
	groups: BudgetGroupSummary[];
	unbudgeted: BudgetCategoryRow[];
	omittedCurrencies: string[];
};

export type GoalType = "save_up" | "pay_down";
export type GoalFunding = "accounts" | "fund";
export type FundEntryKind = "deposit" | "withdrawal" | "interest";

export type FundSummary = { goalId: string; name: string; balance: number };

export type GoalAccount = {
	id: string;
	name: string;
	mask: string | null;
	currentBalance: number;
	isoCurrencyCode: string;
};

export type FundHost = {
	id: string;
	name: string;
	isoCurrencyCode: string;
	balance: number;
	unassigned: number;
	funds: FundSummary[];
};

export type Goal = {
	id: string;
	name: string;
	type: GoalType;
	funding: GoalFunding;
	icon: string;
	color: string;
	thumbnailUrl: string | null;
	targetAmount: number;
	currentAmount: number;
	targetDate: string | null;
	sortOrder: number;
	status: "on_track" | "at_risk";
	percentComplete: number;
	accounts: GoalAccount[];
	host: { id: string; name: string; isoCurrencyCode: string; unassigned: number } | null;
	fundBalance: number | null;
	payoffMonth: string | null;
};

export type GoalsList = {
	totalCurrent: number;
	baseCurrency: string;
	goals: Goal[];
	hosts: FundHost[];
};

export type FundEntry = {
	id: string;
	date: string;
	amount: number;
	kind: FundEntryKind;
	transactionId: string | null;
	note: string | null;
	balanceAfter: number;
};
