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
	/** Operating cash: the Forecast plans bills and income through it. */
	inCashPlan: boolean;
	/** Liabilities: whether Payback pays it down. */
	inDebtPlan: boolean;
	debtPriority: number | null;
	/** Cards and loans: yearly rate in basis points. */
	aprBps: number | null;
	card: CardSummary | null;
	loan: LoanTerms | null;
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

export type CategoryKind = "income" | "expense" | "transfer";
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

type TransactionCategory = { id: string; name: string; icon: string; color: string };

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
	/** True for every part of a split Transaction. */
	isSplit: boolean;
	category: TransactionCategory | null;
	account: {
		id: string;
		name: string;
		mask: string | null;
		institutionLogo: string | null;
	} | null;
	/** The User's other card that would have earned more; null when this one was the best. */
	betterCard: BetterCard | null;
	/** True when this Transaction is linked as a refund of an expense. */
	isRefund: boolean;
	/** True once a Statement import matched or added it. */
	isStatementConfirmed: boolean;
	/** True when a Statement import found no line for this hand-entered row. */
	isNotOnStatement: boolean;
};

export type TransactionDetail = TransactionListItem & {
	notes: string | null;
	plaidPfcPrimary: string | null;
	fundEntry: { id: string; goalId: string; goalName: string } | null;
	similar: TransactionListItem[];
	split: TransactionSplit | null;
	/** The expense this refund pays back, and the refunds that pay this expense back. */
	refund: { of: TransactionListItem | null; refundedBy: TransactionListItem[] };
};

export type Merchant = { name: string; logoUrl: string | null };

export type TransactionRule = {
	id: string;
	merchant: string;
	/** Native cents; null matches any amount. */
	amount: number | null;
	category: TransactionCategory;
};

export type SplitPartInput = { categoryId: string; amount: number };

/** The parts of a split Transaction, parent part first. `total` is the original amount. */
export type TransactionSplit = {
	parentId: string;
	total: number;
	parts: { id: string; amount: number; category: TransactionCategory | null }[];
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

export type DebtStrategy = "avalanche" | "snowball" | "custom";

export type UserSettings = {
	currency: string;
	dashboardWidgets: DashboardWidget[];
	budgetCopyForward: boolean;
	safetyBuffer: number;
	paybackDay: number | null;
	debtStrategy: DebtStrategy;
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
	recurring: { remainingDue: number; upcoming: RecurringListItem[] } | null;
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

export type ReportRange = { dateFrom: string; dateTo: string };

type ReportEnvelope = { baseCurrency: string; omittedCurrencies: string[] };

export type CategoryTotal = {
	categoryId: string;
	categoryName: string;
	color: string;
	icon: string;
	total: number;
};

export type SpendingReport = ReportEnvelope & { categories: CategoryTotal[] };

export type IncomeVsExpensesReport = ReportEnvelope & {
	months: { month: string; income: number; expenses: number }[];
};

export type CashFlowTrendReport = ReportEnvelope & { months: { month: string; net: number }[] };

export type BalanceHistoryReport = ReportEnvelope & {
	accounts: { accountId: string; name: string; isAsset: boolean }[];
	points: { date: string; accountId: string; balance: number }[];
};

export type InvestmentRange = "1m" | "3m" | "1y";

export type InvestmentAccount = BankAccount & { value: number | null; change: number };

export type Investments = {
	range: InvestmentRange;
	baseCurrency: string;
	total: number;
	change: number;
	changePercent: number;
	allocation: { accountId: string; name: string; value: number }[];
	accounts: InvestmentAccount[];
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

export type ForecastSectionType = "revenue" | "savings" | "fixed_expense" | "variable_expense";
export type OneOffStatus = "expected" | "done" | "cancelled";
export type ForecastItemKind =
	| "revenue"
	| "fixed"
	| "variable"
	| "savings"
	| "one_off"
	| "card_payment"
	| "loan_payment"
	| "payback";

export type OneOff = {
	id: string;
	sectionId: string;
	name: string;
	date: string;
	/** Base cents, signed: + inflow, − outflow. */
	amount: number;
	bankAccountId: string | null;
	categoryId: string | null;
	goalId: string | null;
	status: OneOffStatus;
	matchedTransactionId: string | null;
};

export type ForecastRow = {
	id: string;
	sectionId: string;
	name: string;
	dayOfMonth: number | null;
	categoryId: string | null;
	recurringItemId: string | null;
	bankAccountId: string | null;
	goalId: string | null;
	sortOrder: number;
	/** F12.25: the Debt plan already models these payments, so totals leave the row out. */
	countedInDebt: boolean;
	typicalMonthly: number;
	sparkline: number[];
	cells: Record<number, { plan: number; actual: number | null }>;
};

export type ForecastSection = {
	id: string;
	name: string;
	type: ForecastSectionType;
	sortOrder: number;
	rows: ForecastRow[];
	oneOffs: OneOff[];
	totals: Record<number, number>;
};

export type Shortfall = { date: string; short: number };

export type ForecastSummary = {
	baseCurrency: string;
	safetyBuffer: number;
	cashFlow: Record<number, number>;
	operatingCash: Record<number, number>;
	lowPoint: Record<number, { date: string; value: number }>;
	shortfalls: Shortfall[];
	creditCardTotal: Record<number, number>;
	savingsTotal: Record<number, number>;
	fixedExpensesTotal: Record<number, number>;
	variableExpensesTotal: Record<number, number>;
	debtPaymentsTotal: Record<number, number>;
	paybackTotal: Record<number, number>;
	debtTotal: Record<number, number>;
	projectedBalanceSeries: { month: number; value: number; projected: boolean }[];
};

export type ForecastMonthItem = {
	kind: ForecastItemKind;
	name: string;
	amount: number;
	sourceId: string | null;
	split?: { bankAccountId: string; name: string; amount: number }[];
};

export type ForecastMonth = {
	baseCurrency: string;
	safetyBuffer: number;
	openingBalance: number;
	closingBalance: number;
	series: { date: string; value: number; projected: boolean }[];
	lowPoint: { date: string; value: number };
	shortfalls: Shortfall[];
	days: { date: string; net: number; balanceAfter: number; items: ForecastMonthItem[] }[];
};

export type PaymentRule = "statement_balance" | "new_charges" | "minimum" | "fixed";

export type CardStatement = {
	id: string;
	periodStart: string;
	periodEnd: string;
	statementBalance: number;
	minimumPayment: number | null;
	dueDate: string | null;
	source: "plaid" | "manual" | "import";
};

export type StatementLine = { fitId: string; date: string; amount: number; name: string };

export type StatementFields = {
	periodStart: string;
	periodEnd: string;
	statementBalance: number | null;
	minimumPayment: number | null;
	dueDate: string | null;
};

export type StatementImportPreview = {
	statement: StatementFields;
	isMaskMismatch: boolean;
	matched: { line: StatementLine; transaction: TransactionListItem }[];
	newLines: StatementLine[];
	notOnStatement: TransactionListItem[];
	alreadyImported: StatementLine[];
};

export type StatementImportResult = {
	added: number;
	confirmed: number;
	notOnStatement: number;
	statement: CardStatement;
};

export type CardSummary = {
	statementCloseDay: number | null;
	paymentDueDay: number | null;
	paymentRule: PaymentRule;
	fixedPayment: number | null;
	latestStatement: CardStatement | null;
	currentPeriodSpend: number;
	projectedInterest: number;
	utilization: number | null;
	overriddenFields: string[];
};

export type LoanTerms = {
	principal: number | null;
	termMonths: number | null;
	firstPaymentDate: string | null;
	paymentDay: number | null;
	scheduledPayment: number | null;
	extraPayment: number;
	source: "plaid" | "manual";
};

export type StatementPeriod = {
	statement: CardStatement | null;
	periodStart: string;
	periodEnd: string;
	total: number;
	previousPeriodEnd: string | null;
	nextPeriodEnd: string | null;
	transactions: TransactionListItem[];
};

export type AmortizationRow = {
	period: number;
	date: string;
	beginningBalance: number;
	payment: number;
	interest: number;
	principal: number;
	extra: number;
	endingBalance: number;
};

export type AmortizationScenario = {
	extra: number;
	payment: number;
	payoffMonths: number;
	monthsSaved: number;
	totalInterest: number;
	interestSaved: number;
};

export type Amortization = {
	basePayment: number;
	baseTotalInterest: number;
	basePayoffDate: string;
	scenarios: AmortizationScenario[];
	schedule: AmortizationRow[];
};

export type DebtLiability = {
	account: BankAccount;
	share: number;
	scheduledPayment: number;
	payback: number;
	projectedInterest: number;
	payoffMonth: string | null;
};

export type DebtPlan = {
	baseCurrency: string;
	strategy: DebtStrategy;
	safetyBuffer: number;
	paybackDay: number | null;
	totalDebt: number;
	debtFreeMonth: string | null;
	projectedInterest12m: number;
	utilization: number | null;
	liabilities: DebtLiability[];
	notInPlan: { account: BankAccount }[];
	series: { month: string; balances: Record<string, number>; payback: number }[];
};

export type ForecastDebtSection = {
	type: "debt";
	rows: {
		bankAccountId: string;
		name: string;
		kind: "card_payment" | "loan_payment";
		cells: Record<number, { scheduled: number; payback: number; actual: number | null }>;
	}[];
	totals: Record<number, number>;
};

export type Cadence = "weekly" | "monthly" | "yearly";

/** A pattern detection found that no RecurringItem tracks yet. */
export type RecurringCandidate = {
	merchantName: string;
	merchantLogoUrl: string | null;
	/** Absolute cents in `isoCurrencyCode`, an outflow. */
	amount: number;
	isoCurrencyCode: string;
	cadence: Cadence;
	nextDate: string;
	/** Negative once `nextDate` has passed. */
	daysUntil: number;
	categoryId: string | null;
	account: { id: string; name: string } | null;
};

export type RecurringListItem = RecurringCandidate & {
	id: string;
	lastPaidOn: string | null;
	isActive: boolean;
	isManual: boolean;
};

export type RecurringMonth = {
	month: string;
	baseCurrency: string;
	remainingDue: number;
	paid: number;
	items: RecurringListItem[];
};

export const REWARD_CURRENCIES = ["cash_back", "points", "miles"] as const;
export type RewardCurrency = (typeof REWARD_CURRENCIES)[number];

/** Merchant types issuers pay bonus rates on; mapped from the Plaid category at read. */
export const REWARD_CATEGORIES = [
	"dining",
	"groceries",
	"gas",
	"travel",
	"transit",
	"streaming",
	"entertainment",
	"drugstores",
	"online_shopping",
	"other",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];

export const CAP_PERIODS = ["month", "quarter", "year"] as const;
export type CapPeriod = (typeof CAP_PERIODS)[number];

export const CREDIT_PERIODS = ["month", "quarter", "half_year", "year"] as const;
export type CreditPeriod = (typeof CREDIT_PERIODS)[number];

export type EarnRule = {
	label: string;
	/** Units per $100 of spend: 200 = 2% cash back, 300 = 3 points per dollar. */
	ratePer100: number;
	categories: RewardCategory[];
	/** Case-insensitive whole words or phrases in the merchant or Transaction name. */
	merchants: string[];
	/** Spend (native cents) per calendar period that earns this rate; the rest earns the base rate. */
	cap: { amount: number; period: CapPeriod } | null;
};

export type BenefitCredit = {
	label: string;
	/** Native cents per calendar period. */
	amount: number;
	period: CreditPeriod;
	categories: RewardCategory[];
	merchants: string[];
};

export type CardPerk = { label: string; description: string | null };

/** Card benefits as stored on a credit BankAccount. */
export type CardBenefitsInput = {
	productName: string;
	rewardCurrency: RewardCurrency;
	/** Hundredths of a cent per unit: 125 = 1.25¢ a point. Cash back is always 100. */
	unitValue: number;
	baseRatePer100: number;
	earnRules: EarnRule[];
	credits: BenefitCredit[];
	perks: CardPerk[];
	/** Native cents. */
	annualFee: number | null;
};

export type CardBenefits = CardBenefitsInput & {
	/** The Card product preset these came from; null when entered through the API. */
	presetKey: string | null;
};

export type CardPresetSummary = { key: string; issuer: string; productName: string };

export type RuleEarnings = {
	/** The Earn rule label, or "Everything else" for the base rate. */
	label: string;
	ratePer100: number;
	spend: number;
	units: number;
	value: number;
};

export type RewardsPeriod = {
	from: string;
	to: string;
	/** Native cents of purchases net of refunds, Transfers left out. */
	spend: number;
	/** Cents for cash back, else points or miles. */
	units: number;
	/** Estimated native cents. */
	value: number;
	byRule: RuleEarnings[];
};

export type BenefitCreditStatus = BenefitCredit & {
	periodStart: string;
	periodEnd: string;
	used: number;
	remaining: number;
};

export type RewardsTracking = {
	/** The current calendar month. */
	month: RewardsPeriod;
	/** January 1 through today. */
	year: RewardsPeriod;
	credits: BenefitCreditStatus[];
};

export type CreditCard = {
	id: string;
	name: string;
	officialName: string | null;
	mask: string | null;
	institutionName: string | null;
	institutionLogo: string | null;
	isoCurrencyCode: string;
	currentBalance: number;
	/** Plaid's available balance, else limit − balance; null without a limit. */
	availableCredit: number | null;
	creditLimit: number | null;
	utilization: number | null;
	aprBps: number | null;
	billingPeriod: {
		/** First day of the open period. */
		periodStart: string;
		/** Next statement close date; null when the close day is unknown. */
		closesOn: string | null;
		/** Next payment due date; null when unknown. */
		dueOn: string | null;
		/** Native cents charged in the open period. */
		spend: number;
		latestStatement: CardStatement | null;
	};
	benefits: CardBenefits | null;
	/** null until the card has benefits. */
	rewards: RewardsTracking | null;
};

/** The User's other card that would have earned more on a Transaction. */
export type BetterCard = {
	accountId: string;
	name: string;
	mask: string | null;
	/** Estimated extra value in the Transaction's native cents; always > 0. */
	extraValue: number;
};
