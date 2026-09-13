import {
	type AccountBase,
	Configuration,
	CountryCode,
	PlaidApi,
	PlaidEnvironments,
	Products,
} from "plaid";
import type { PlaidAccountSnapshot, PlaidPort } from "./plaid.port";

export class RealPlaid implements PlaidPort {
	configured = true;
	private readonly client: PlaidApi;

	constructor(clientId: string, secret: string, env: string) {
		const basePath =
			env === "production"
				? PlaidEnvironments.production
				: env === "development"
					? PlaidEnvironments.development
					: PlaidEnvironments.sandbox;
		this.client = new PlaidApi(
			new Configuration({
				basePath,
				baseOptions: {
					headers: {
						"PLAID-CLIENT-ID": clientId,
						"PLAID-SECRET": secret,
					},
				},
			}),
		);
	}

	async createLinkToken(userId: string, accessToken?: string) {
		const response = await this.client.linkTokenCreate({
			user: { client_user_id: userId },
			client_name: "Money Airport",
			country_codes: [CountryCode.Us],
			language: "en",
			...(accessToken ? { access_token: accessToken } : { products: [Products.Transactions] }),
		});
		return response.data.link_token;
	}

	async exchangePublicToken(publicToken: string) {
		const response = await this.client.itemPublicTokenExchange({ public_token: publicToken });
		return {
			accessToken: response.data.access_token,
			itemId: response.data.item_id,
		};
	}

	async getAccounts(accessToken: string) {
		const response = await this.client.accountsGet({ access_token: accessToken });
		const institutionId = response.data.item.institution_id ?? null;
		let institutionName: string | null = null;
		let institutionLogo: string | null = null;
		if (institutionId) {
			try {
				const institution = await this.client.institutionsGetById({
					institution_id: institutionId,
					country_codes: [CountryCode.Us],
					options: { include_optional_metadata: true },
				});
				institutionName = institution.data.institution.name;
				institutionLogo = institution.data.institution.logo ?? null;
			} catch {
				institutionName = null;
			}
		}
		return {
			institutionId,
			institutionName,
			institutionLogo,
			accounts: response.data.accounts.map(mapAccount),
		};
	}
}

function mapAccount(account: AccountBase): PlaidAccountSnapshot {
	const subtype = account.subtype ?? null;
	const type = account.type;
	const { displayGroup, isAsset, mappedType } = classify(type, subtype);
	const current = Math.round((account.balances.current ?? 0) * 100);
	const available =
		account.balances.available == null ? null : Math.round(account.balances.available * 100);
	const creditLimit =
		account.balances.limit == null ? null : Math.round(account.balances.limit * 100);
	return {
		plaidAccountId: account.account_id,
		name: account.name,
		officialName: account.official_name ?? null,
		type: mappedType,
		subtype,
		mask: account.mask ?? null,
		currentBalance: current,
		availableBalance: available,
		creditLimit,
		isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
		displayGroup,
		isAsset,
	};
}

function classify(type: string, subtype: string | null) {
	if (type === "credit" || subtype === "credit card") {
		return { displayGroup: "credit" as const, isAsset: false, mappedType: "credit" };
	}
	if (type === "loan") {
		return { displayGroup: "loan" as const, isAsset: false, mappedType: "loan" };
	}
	if (type === "investment") {
		return { displayGroup: "investment" as const, isAsset: true, mappedType: "investment" };
	}
	if (subtype === "checking") {
		return { displayGroup: "cash" as const, isAsset: true, mappedType: "checking" };
	}
	if (subtype === "savings") {
		return { displayGroup: "cash" as const, isAsset: true, mappedType: "savings" };
	}
	return { displayGroup: "other" as const, isAsset: true, mappedType: "other" };
}

export class UnconfiguredPlaid implements PlaidPort {
	configured = false;

	async createLinkToken(_userId?: string, _accessToken?: string): Promise<string> {
		throw new Error("Plaid is not configured");
	}

	async exchangePublicToken(): Promise<{ accessToken: string; itemId: string }> {
		throw new Error("Plaid is not configured");
	}

	async getAccounts(_accessToken: string): Promise<{
		institutionId: string | null;
		institutionName: string | null;
		institutionLogo: string | null;
		accounts: PlaidAccountSnapshot[];
	}> {
		throw new Error("Plaid is not configured");
	}
}
