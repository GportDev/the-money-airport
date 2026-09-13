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
