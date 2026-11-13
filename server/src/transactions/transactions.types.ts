export const TRANSFER_TAGS = ["transfer", "savings_transfer"] as const;
export type TransferTag = (typeof TRANSFER_TAGS)[number];

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
	/** The Fund this Transaction was assigned to. */
	fundEntry: { id: string; goalId: string; goalName: string } | null;
	similar: TransactionListItem[];
};

export type TransactionFilters = {
	cursor?: string;
	limit: number;
	dateFrom?: string;
	dateTo?: string;
	accountIds: string[];
	categoryIds: string[];
	search?: string;
	pending?: boolean;
	amountMin?: number;
	amountMax?: number;
	sortDir: "asc" | "desc";
};
