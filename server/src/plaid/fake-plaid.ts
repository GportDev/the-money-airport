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

export class FakePlaid implements PlaidPort {
	configured = true;

	async createLinkToken(_userId: string, _accessToken?: string) {
		return "link-sandbox-fake";
	}

	async exchangePublicToken(publicToken: string) {
		if (publicToken === SAVINGS_PUBLIC_TOKEN) {
			return { accessToken: SAVINGS_ACCESS_TOKEN, itemId: "item-fake-savings" };
		}
		return { accessToken: "access-sandbox-fake", itemId: "item-fake-1" };
	}

	async getLiabilities(accessToken: string): Promise<PlaidLiabilities> {
		if (accessToken === SAVINGS_ACCESS_TOKEN) {
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
		return {
			institutionId: "ins_1",
			institutionName: "First Platypus Bank",
			institutionLogo: null,
			accounts: FAKE_ACCOUNTS,
		};
	}

	async syncTransactions(accessToken: string, cursor: string | null) {
		return accessToken === SAVINGS_ACCESS_TOKEN ? fakeSavingsPage(cursor) : fakePage(cursor);
	}

	async verifyWebhook(verification: string, _rawBody: Buffer) {
		return verification === "fake";
	}
}
