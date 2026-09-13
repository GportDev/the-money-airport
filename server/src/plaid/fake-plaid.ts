import type { PlaidAccountSnapshot, PlaidPort } from "./plaid.port";

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
}
