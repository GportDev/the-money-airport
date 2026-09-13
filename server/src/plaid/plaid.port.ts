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
};

export const PLAID_PORT = "PLAID_PORT";
