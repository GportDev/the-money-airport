import type {
	PlaidAccountSnapshot,
	PlaidLiabilities,
	PlaidPort,
	PlaidTransactionSnapshot,
	PlaidTransactionsPage,
} from "./plaid.port";

const FAKE_ACCOUNTS: PlaidAccountSnapshot[] = [
	{
		plaidAccountId: "fake-checking",
		name: "Plaid Checking",
		officialName: "Plaid Gold Standard 0% Interest Checking",
		type: "checking",
		subtype: "checking",
		mask: "0000",
		currentBalance: 110000,
		availableBalance: 110000,
		creditLimit: null,
		isoCurrencyCode: "USD",
		displayGroup: "cash",
		isAsset: true,
	},
	{
		plaidAccountId: "fake-credit",
		name: "Plaid Credit Card",
		officialName: "Plaid Diamond 12.5% APR Interest Credit Card",
		type: "credit",
		subtype: "credit card",
		mask: "3333",
		currentBalance: 41000,
		availableBalance: null,
		creditLimit: 200000,
		isoCurrencyCode: "USD",
		displayGroup: "credit",
		isAsset: false,
	},
];

/** A second Item, reached with SAVINGS_PUBLIC_TOKEN, for Fund interest tests. */
const SAVINGS_PUBLIC_TOKEN = "public-sandbox-fake-savings";
const SAVINGS_ACCESS_TOKEN = "access-sandbox-fake-savings";

const FAKE_SAVINGS_ACCOUNTS: PlaidAccountSnapshot[] = [
	{
		plaidAccountId: "fake-savings",
		name: "Plaid Saving",
		officialName: "Plaid Silver Standard 0.1% Interest Saving",
		type: "savings",
		subtype: "savings",
		mask: "1111",
		currentBalance: 1000000,
		availableBalance: 1000000,
		creditLimit: null,
		isoCurrencyCode: "USD",
		displayGroup: "cash",
		isAsset: true,
	},
];

function daysAgo(days: number) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

function fakeTransaction(
	input: Partial<PlaidTransactionSnapshot> &
		Pick<PlaidTransactionSnapshot, "plaidTransactionId" | "plaidAccountId" | "name" | "amount">,
	days: number,
): PlaidTransactionSnapshot {
	return {
		pendingTransactionId: null,
		merchantName: null,
		logoUrl: null,
		isoCurrencyCode: "USD",
		date: daysAgo(days),
		pending: false,
		pfcPrimary: null,
		pfcDetailed: null,
		legacyCategory: null,
		...input,
	};
}

/**
 * Two pages of changes. The first is the initial pull. The second posts the pending
 * Amazon charge (Plaid sends the posted row as added and the pending id as removed).
 */
function fakePage(cursor: string | null): PlaidTransactionsPage {
	if (cursor === null) {
		return {
			added: [
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-coffee",
						plaidAccountId: "fake-checking",
						name: "Joe Coffee",
						merchantName: "Joe Coffee",
						amount: -475,
						pfcPrimary: "FOOD_AND_DRINK",
						pfcDetailed: "FOOD_AND_DRINK_COFFEE",
					},
					1,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-groceries",
						plaidAccountId: "fake-checking",
						name: "Whole Foods Market",
						merchantName: "Whole Foods",
						amount: -8423,
						pfcPrimary: "FOOD_AND_DRINK",
						pfcDetailed: "FOOD_AND_DRINK_GROCERIES",
					},
					2,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-salary",
						plaidAccountId: "fake-checking",
						name: "ACME Payroll",
						merchantName: "ACME",
						amount: 350000,
						pfcPrimary: "INCOME",
						pfcDetailed: "INCOME_WAGES",
					},
					3,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-card-payment-out",
						plaidAccountId: "fake-checking",
						name: "Payment to Plaid Credit Card",
						amount: -41000,
						pfcPrimary: "LOAN_PAYMENTS",
						pfcDetailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
					},
					4,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-card-payment-in",
						plaidAccountId: "fake-credit",
						name: "Payment received, thank you",
						amount: 41000,
						pfcPrimary: "LOAN_PAYMENTS",
						pfcDetailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
					},
					3,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-uber",
						plaidAccountId: "fake-credit",
						name: "Uber 063015 SF**POOL**",
						merchantName: "Uber",
						amount: -1850,
						pfcPrimary: "TRANSPORTATION",
						pfcDetailed: "TRANSPORTATION_TAXIS_AND_RIDE_SHARES",
					},
					1,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-amazon-pending",
						plaidAccountId: "fake-credit",
						name: "Amazon",
						merchantName: "Amazon",
						amount: -2599,
						pending: true,
						pfcPrimary: "GENERAL_MERCHANDISE",
						pfcDetailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
					},
					0,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-mystery",
						plaidAccountId: "fake-checking",
						name: "ACH DEBIT 0042",
						amount: -1200,
					},
					5,
				),
			],
			modified: [],
			removed: [],
			nextCursor: "fake-cursor-1",
		};
	}
	if (cursor === "fake-cursor-1") {
		return {
			added: [
				fakeTransaction(
					{
						plaidTransactionId: "fake-tx-amazon-posted",
						plaidAccountId: "fake-credit",
						pendingTransactionId: "fake-tx-amazon-pending",
						name: "Amazon",
						merchantName: "Amazon",
						amount: -2599,
						pfcPrimary: "GENERAL_MERCHANDISE",
						pfcDetailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
					},
					0,
				),
			],
			modified: [],
			removed: ["fake-tx-amazon-pending"],
			nextCursor: "fake-cursor-2",
		};
	}
	return { added: [], modified: [], removed: [], nextCursor: cursor };
}

function fakeSavingsPage(cursor: string | null): PlaidTransactionsPage {
	if (cursor !== null) {
		return { added: [], modified: [], removed: [], nextCursor: cursor };
	}
	return {
		added: [
			fakeTransaction(
				{
					plaidTransactionId: "fake-tx-savings-interest",
					plaidAccountId: "fake-savings",
					name: "Interest paid",
					amount: 3001,
					pfcPrimary: "INCOME",
					pfcDetailed: "INCOME_INTEREST_EARNED",
				},
				0,
			),
		],
		modified: [],
		removed: [],
		nextCursor: "fake-savings-cursor-1",
	};
}

/** A third Item, reached with HISTORY_PUBLIC_TOKEN, for balance backfill tests. */
const HISTORY_PUBLIC_TOKEN = "public-sandbox-fake-history";
const HISTORY_ACCESS_TOKEN = "access-sandbox-fake-history";

function historyAccount(
	input: Pick<
		PlaidAccountSnapshot,
		"plaidAccountId" | "name" | "type" | "currentBalance" | "displayGroup" | "isAsset"
	>,
): PlaidAccountSnapshot {
	return {
		officialName: null,
		subtype: null,
		mask: null,
		availableBalance: null,
		creditLimit: null,
		isoCurrencyCode: "USD",
		...input,
	};
}

const FAKE_HISTORY_ACCOUNTS: PlaidAccountSnapshot[] = [
	historyAccount({
		plaidAccountId: "fake-history-checking",
		name: "History Checking",
		type: "checking",
		currentBalance: 110000,
		displayGroup: "cash",
		isAsset: true,
	}),
	historyAccount({
		plaidAccountId: "fake-history-card",
		name: "History Card",
		type: "credit",
		currentBalance: 41000,
		displayGroup: "credit",
		isAsset: false,
	}),
	historyAccount({
		plaidAccountId: "fake-history-brokerage",
		name: "History Brokerage",
		type: "investment",
		currentBalance: 500000,
		displayGroup: "investment",
		isAsset: true,
	}),
	historyAccount({
		plaidAccountId: "fake-history-loan",
		name: "History Loan",
		type: "loan",
		currentBalance: 1000000,
		displayGroup: "loan",
		isAsset: false,
	}),
];

function fakeHistoryPage(cursor: string | null): PlaidTransactionsPage {
	if (cursor !== null) {
		return { added: [], modified: [], removed: [], nextCursor: cursor };
	}
	const posted = [
		{ id: "fake-history-old-spend", account: "fake-history-checking", amount: -10000, days: 300 },
		{ id: "fake-history-deposit", account: "fake-history-checking", amount: 50000, days: 10 },
		{ id: "fake-history-card-buy", account: "fake-history-card", amount: -2000, days: 5 },
		{ id: "fake-history-brokerage", account: "fake-history-brokerage", amount: 10000, days: 7 },
		{ id: "fake-history-loan-pay", account: "fake-history-loan", amount: 30000, days: 6 },
	];
	return {
		added: [
			...posted.map((row) =>
				fakeTransaction(
					{
						plaidTransactionId: row.id,
						plaidAccountId: row.account,
						name: row.id,
						amount: row.amount,
					},
					row.days,
				),
			),
			fakeTransaction(
				{
					plaidTransactionId: "fake-history-pending",
					plaidAccountId: "fake-history-checking",
					name: "fake-history-pending",
					amount: -5000,
					pending: true,
				},
				2,
			),
		],
		modified: [],
		removed: [],
		nextCursor: "fake-history-cursor-1",
	};
}

/**
 * A fourth Item whose history arrives late: the first pull is empty, the next brings two
 * transactions, and the one after removes the older of them.
 */
const LATE_PUBLIC_TOKEN = "public-sandbox-fake-late-history";
const LATE_ACCESS_TOKEN = "access-sandbox-fake-late-history";

const FAKE_LATE_ACCOUNTS: PlaidAccountSnapshot[] = [
	historyAccount({
		plaidAccountId: "fake-late-checking",
		name: "Late Checking",
		type: "checking",
		currentBalance: 200000,
		displayGroup: "cash",
		isAsset: true,
	}),
];

function fakeLatePage(cursor: string | null): PlaidTransactionsPage {
	const empty = { added: [], modified: [], removed: [] };
	if (cursor === null) {
		return { ...empty, nextCursor: "fake-late-cursor-1" };
	}
	if (cursor === "fake-late-cursor-1") {
		return {
			...empty,
			added: [
				fakeTransaction(
					{
						plaidTransactionId: "fake-late-old",
						plaidAccountId: "fake-late-checking",
						name: "fake-late-old",
						amount: -1000,
					},
					60,
				),
				fakeTransaction(
					{
						plaidTransactionId: "fake-late-new",
						plaidAccountId: "fake-late-checking",
						name: "fake-late-new",
						amount: 3000,
					},
					20,
				),
			],
			nextCursor: "fake-late-cursor-2",
		};
	}
	if (cursor === "fake-late-cursor-2") {
		return { ...empty, removed: ["fake-late-old"], nextCursor: "fake-late-cursor-3" };
	}
	return { ...empty, nextCursor: cursor };
}

type FakeItem = {
	accessToken: string;
	itemId: string;
	institutionId: string;
	institutionName: string;
	accounts: PlaidAccountSnapshot[];
	page: (cursor: string | null) => PlaidTransactionsPage;
};

/** Extra Items by public token; any other token links the default Item. */
const FAKE_ITEMS: Record<string, FakeItem> = {
	[HISTORY_PUBLIC_TOKEN]: {
		accessToken: HISTORY_ACCESS_TOKEN,
		itemId: "item-fake-history",
		institutionId: "ins_4",
		institutionName: "Bettong Credit Union",
		accounts: FAKE_HISTORY_ACCOUNTS,
		page: fakeHistoryPage,
	},
	[LATE_PUBLIC_TOKEN]: {
		accessToken: LATE_ACCESS_TOKEN,
		itemId: "item-fake-late-history",
		institutionId: "ins_5",
		institutionName: "Quokka Savings Bank",
		accounts: FAKE_LATE_ACCOUNTS,
		page: fakeLatePage,
	},
};

function fakeItemByAccessToken(accessToken: string) {
	return Object.values(FAKE_ITEMS).find((item) => item.accessToken === accessToken);
}

export class FakePlaid implements PlaidPort {
	configured = true;

	async createLinkToken(_userId: string, _accessToken?: string) {
		return "link-sandbox-fake";
	}

	async exchangePublicToken(publicToken: string) {
		if (publicToken === SAVINGS_PUBLIC_TOKEN) {
			return { accessToken: SAVINGS_ACCESS_TOKEN, itemId: "item-fake-savings" };
		}
		const extra = FAKE_ITEMS[publicToken];
		if (extra) {
			return { accessToken: extra.accessToken, itemId: extra.itemId };
		}
		return { accessToken: "access-sandbox-fake", itemId: "item-fake-1" };
	}

	async getLiabilities(accessToken: string): Promise<PlaidLiabilities> {
		if (accessToken === SAVINGS_ACCESS_TOKEN || fakeItemByAccessToken(accessToken)) {
			return { cards: [], loans: [] };
		}
		return {
			cards: [
				{
					plaidAccountId: "fake-credit",
					aprBps: 1250,
					lastStatementBalance: 41000,
					minimumPayment: 2000,
					lastStatementIssueDate: daysAgo(15),
					nextPaymentDueDate: daysAgo(-15),
				},
			],
			loans: [],
		};
	}

	async getAccounts(accessToken: string) {
		if (accessToken === SAVINGS_ACCESS_TOKEN) {
			return {
				institutionId: "ins_3",
				institutionName: "Tattersall Savings",
				institutionLogo: null,
				accounts: FAKE_SAVINGS_ACCOUNTS,
			};
		}
		const extra = fakeItemByAccessToken(accessToken);
		if (extra) {
			return {
				institutionId: extra.institutionId,
				institutionName: extra.institutionName,
				institutionLogo: null,
				accounts: extra.accounts,
			};
		}
		return {
			institutionId: "ins_1",
			institutionName: "First Platypus Bank",
			institutionLogo: null,
			accounts: FAKE_ACCOUNTS,
		};
	}

	async syncTransactions(accessToken: string, cursor: string | null) {
		const extra = fakeItemByAccessToken(accessToken);
		if (extra) {
			return extra.page(cursor);
		}
		return accessToken === SAVINGS_ACCESS_TOKEN ? fakeSavingsPage(cursor) : fakePage(cursor);
	}

	async verifyWebhook(verification: string, _rawBody: Buffer) {
		return verification === "fake";
	}
}
