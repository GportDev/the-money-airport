export type PlaidAccountSnapshot = {
	plaidAccountId: string;
	name: string;
	officialName: string | null;
	type: string;
	subtype: string | null;
	mask: string | null;
	currentBalance: number;
	availableBalance: number | null;
	creditLimit: number | null;
	isoCurrencyCode: string;
	displayGroup: "cash" | "credit" | "investment" | "loan" | "vehicle" | "other";
	isAsset: boolean;
};

/** A Plaid transaction in our sign convention: positive = income, negative = expense, in cents. */
export type PlaidTransactionSnapshot = {
	plaidTransactionId: string;
	plaidAccountId: string;
	pendingTransactionId: string | null;
	name: string;
	merchantName: string | null;
	logoUrl: string | null;
	amount: number;
	isoCurrencyCode: string | null;
	date: string;
	pending: boolean;
	pfcPrimary: string | null;
	pfcDetailed: string | null;
	legacyCategory: string[] | null;
};

export type PlaidTransactionsPage = {
	added: PlaidTransactionSnapshot[];
	modified: PlaidTransactionSnapshot[];
	removed: string[];
	nextCursor: string;
};

/** Plaid Liabilities in cents, basis points, and ISO dates. */
export type PlaidCardLiability = {
	plaidAccountId: string;
	aprBps: number | null;
	lastStatementBalance: number | null;
	minimumPayment: number | null;
	lastStatementIssueDate: string | null;
	nextPaymentDueDate: string | null;
};

export type PlaidLoanLiability = {
	plaidAccountId: string;
	aprBps: number | null;
	principal: number | null;
	termMonths: number | null;
	firstPaymentDate: string | null;
	nextPaymentDueDate: string | null;
	scheduledPayment: number | null;
};

export type PlaidLiabilities = { cards: PlaidCardLiability[]; loans: PlaidLoanLiability[] };

export type PlaidPort = {
	configured: boolean;
	createLinkToken: (userId: string, accessToken?: string) => Promise<string>;
	exchangePublicToken: (publicToken: string) => Promise<{ accessToken: string; itemId: string }>;
	getAccounts: (accessToken: string) => Promise<{
		institutionId: string | null;
		institutionName: string | null;
		institutionLogo: string | null;
		accounts: PlaidAccountSnapshot[];
	}>;
	/** Pulls every page after `cursor` and returns the merged changes plus the cursor to store. */
	syncTransactions: (accessToken: string, cursor: string | null) => Promise<PlaidTransactionsPage>;
	/** Card and loan terms from /liabilities/get; empty when the Item has none. */
	getLiabilities: (accessToken: string) => Promise<PlaidLiabilities>;
	/** Checks the `Plaid-Verification` JWT against the exact raw request body. */
	verifyWebhook: (verification: string, rawBody: Buffer) => Promise<boolean>;
};

export const PLAID_PORT = "PLAID_PORT";
