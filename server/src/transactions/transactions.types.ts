import type { BetterCard } from "../card-benefits/card-benefits.types";

export const TRANSFER_TAGS = ["transfer", "savings_transfer"] as const;
export type TransferTag = (typeof TRANSFER_TAGS)[number];

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
};

export type TransactionDetail = TransactionListItem & {
	notes: string | null;
	plaidPfcPrimary: string | null;
	/** The Fund this Transaction was assigned to. */
	fundEntry: { id: string; goalId: string; goalName: string } | null;
	similar: TransactionListItem[];
	split: TransactionSplit | null;
	/** The expense this refund pays back, and the refunds that pay this expense back. */
	refund: { of: TransactionListItem | null; refundedBy: TransactionListItem[] };
};

export type MerchantDto = { name: string; logoUrl: string | null };

export type TransactionRuleDto = {
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
