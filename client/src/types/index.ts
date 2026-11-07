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
