import type {
	PlaidAccountSnapshot,
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

export class FakePlaid implements PlaidPort {
	configured = true;

	async createLinkToken(_userId: string, _accessToken?: string) {
		return "link-sandbox-fake";
	}

	async exchangePublicToken(_publicToken: string) {
		return { accessToken: "access-sandbox-fake", itemId: "item-fake-1" };
	}

	async getAccounts(_accessToken: string) {
		return {
			institutionId: "ins_1",
			institutionName: "First Platypus Bank",
			institutionLogo: null,
			accounts: FAKE_ACCOUNTS,
		};
	}

	async syncTransactions(_accessToken: string, cursor: string | null) {
		return fakePage(cursor);
	}

	async verifyWebhook(verification: string, _rawBody: Buffer) {
		return verification === "fake";
	}
}
