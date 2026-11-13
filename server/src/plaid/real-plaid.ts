import { createHash, createPublicKey, type JsonWebKey, timingSafeEqual, verify } from "node:crypto";
import {
	type AccountBase,
	Configuration,
	CountryCode,
	type JWKPublicKey,
	PlaidApi,
	PlaidEnvironments,
	Products,
	type Transaction,
} from "plaid";
import type {
	PlaidAccountSnapshot,
	PlaidLiabilities,
	PlaidPort,
	PlaidTransactionSnapshot,
	PlaidTransactionsPage,
} from "./plaid.port";
import { mapLiabilities, NO_LIABILITIES } from "./plaid-liabilities";

/** Plaid keeps up to 24 months of history; ask for all of it at first Link. */
const DAYS_REQUESTED = 730;
/** Plaid's guidance: reject webhooks whose JWT is older than five minutes. */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;
const MAX_SYNC_RESTARTS = 3;

export class RealPlaid implements PlaidPort {
	configured = true;
	private readonly client: PlaidApi;

	private readonly webhookKeys = new Map<string, JWKPublicKey>();

	constructor(
		clientId: string,
		secret: string,
		env: string,
		private readonly webhookUrl?: string,
	) {
		// Plaid retired its Development environment; anything but production is sandbox.
		const basePath =
			env === "production" ? PlaidEnvironments.production : PlaidEnvironments.sandbox;
		this.client = withSanitizedErrors(
			new PlaidApi(
				new Configuration({
					basePath,
					baseOptions: {
						headers: {
							"PLAID-CLIENT-ID": clientId,
							"PLAID-SECRET": secret,
						},
					},
				}),
			),
		);
	}

	async createLinkToken(userId: string, accessToken?: string) {
		const response = await this.client.linkTokenCreate({
			user: { client_user_id: userId },
			client_name: "Money Airport",
			country_codes: [CountryCode.Us],
			language: "en",
			...(this.webhookUrl ? { webhook: this.webhookUrl } : {}),
			...(accessToken
				? { access_token: accessToken }
				: {
						products: [Products.Transactions],
						optional_products: [Products.Liabilities],
						transactions: { days_requested: DAYS_REQUESTED },
					}),
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

	async getLiabilities(accessToken: string): Promise<PlaidLiabilities> {
		try {
			const response = await this.client.liabilitiesGet({ access_token: accessToken });
			return mapLiabilities(response.data.liabilities);
		} catch (error) {
			if (NO_LIABILITIES.has(plaidErrorCodeOf(error) ?? "")) {
				return { cards: [], loans: [] };
			}
			throw error;
		}
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

	async syncTransactions(
		accessToken: string,
		cursor: string | null,
	): Promise<PlaidTransactionsPage> {
		// Plaid can mutate data mid-pagination; the fix is to restart from the original cursor.
		for (let attempt = 0; ; attempt += 1) {
			try {
				return await this.pullAllPages(accessToken, cursor);
			} catch (error) {
				if (
					attempt < MAX_SYNC_RESTARTS &&
					plaidErrorCodeOf(error) === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"
				) {
					continue;
				}
				throw error;
			}
		}
	}

	private async pullAllPages(accessToken: string, cursor: string | null) {
		const added: PlaidTransactionSnapshot[] = [];
		const modified: PlaidTransactionSnapshot[] = [];
		const removed: string[] = [];
		let next = cursor ?? undefined;
		for (;;) {
			const response = await this.client.transactionsSync({
				access_token: accessToken,
				cursor: next,
				count: 500,
				options: { include_personal_finance_category: true, days_requested: DAYS_REQUESTED },
			});
			added.push(...response.data.added.map(mapTransaction));
			modified.push(...response.data.modified.map(mapTransaction));
			removed.push(...response.data.removed.map((row) => row.transaction_id));
			next = response.data.next_cursor;
			if (!response.data.has_more) {
				break;
			}
		}
		return { added, modified, removed, nextCursor: next ?? cursor ?? "" };
	}

	async verifyWebhook(verification: string, rawBody: Buffer) {
		try {
			const [encodedHeader, encodedPayload, encodedSignature] = verification.split(".");
			if (!encodedHeader || !encodedPayload || !encodedSignature) {
				return false;
			}
			const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
				alg?: string;
				kid?: string;
			};
			if (header.alg !== "ES256" || !header.kid) {
				return false;
			}
			const jwk = await this.webhookKey(header.kid);
			if (!jwk || jwk.expired_at !== null) {
				return false;
			}
			const publicKey = createPublicKey({
				key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } as JsonWebKey,
				format: "jwk",
			});
			const signed = verify(
				"sha256",
				Buffer.from(`${encodedHeader}.${encodedPayload}`),
				{ key: publicKey, dsaEncoding: "ieee-p1363" },
				Buffer.from(encodedSignature, "base64url"),
			);
			if (!signed) {
				return false;
			}
			const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
				iat?: number;
				request_body_sha256?: string;
			};
			if (
				typeof payload.iat !== "number" ||
				Date.now() / 1000 - payload.iat > MAX_WEBHOOK_AGE_SECONDS ||
				typeof payload.request_body_sha256 !== "string"
			) {
				return false;
			}
			const expected = Buffer.from(createHash("sha256").update(rawBody).digest("hex"));
			const claimed = Buffer.from(payload.request_body_sha256);
			return expected.length === claimed.length && timingSafeEqual(expected, claimed);
		} catch {
			return false;
		}
	}

	private async webhookKey(kid: string) {
		const cached = this.webhookKeys.get(kid);
		if (cached && cached.expired_at === null) {
			return cached;
		}
		const response = await this.client.webhookVerificationKeyGet({ key_id: kid });
		this.webhookKeys.set(kid, response.data.key);
		return response.data.key;
	}
}

function mapTransaction(tx: Transaction): PlaidTransactionSnapshot {
	return {
		plaidTransactionId: tx.transaction_id,
		plaidAccountId: tx.account_id,
		pendingTransactionId: tx.pending_transaction_id ?? null,
		name: tx.name,
		merchantName: tx.merchant_name ?? null,
		logoUrl: tx.logo_url ?? tx.counterparties?.find((row) => row.logo_url)?.logo_url ?? null,
		// Plaid: positive = money out. Ours: positive = money in.
		amount: Math.round(tx.amount * -100),
		isoCurrencyCode: tx.iso_currency_code ?? tx.unofficial_currency_code ?? null,
		date: tx.date,
		pending: tx.pending,
		pfcPrimary: tx.personal_finance_category?.primary ?? null,
		pfcDetailed: tx.personal_finance_category?.detailed ?? null,
		legacyCategory: tx.category ?? null,
	};
}

/**
 * A Plaid API failure with only Plaid's error fields. The raw axios error carries the request
 * config, including the PLAID-SECRET header, and Nest's default handler logs it whole.
 */
export class PlaidApiError extends Error {
	readonly response: {
		status: number | null;
		data: { error_code: string | null; error_type: string | null; error_message: string | null };
	};

	constructor(status: number | null, data: Record<string, unknown> | undefined) {
		const errorCode = typeof data?.error_code === "string" ? data.error_code : null;
		const errorType = typeof data?.error_type === "string" ? data.error_type : null;
		const errorMessage = typeof data?.error_message === "string" ? data.error_message : null;
		super(`Plaid request failed: ${errorCode ?? status ?? "network error"}`);
		this.name = "PlaidApiError";
		this.response = {
			status,
			data: { error_code: errorCode, error_type: errorType, error_message: errorMessage },
		};
	}
}

function sanitizePlaidError(error: unknown): PlaidApiError {
	const response =
		error && typeof error === "object" && "response" in error
			? (error as { response?: { status?: unknown; data?: unknown } }).response
			: undefined;
	const status = typeof response?.status === "number" ? response.status : null;
	const data =
		response?.data && typeof response.data === "object"
			? (response.data as Record<string, unknown>)
			: undefined;
	return new PlaidApiError(status, data);
}

/** Wraps every PlaidApi method so rejections never leak the request config or headers. */
function withSanitizedErrors(client: PlaidApi): PlaidApi {
	return new Proxy(client, {
		get(target, property, receiver) {
			const value = Reflect.get(target, property, receiver);
			if (typeof value !== "function") {
				return value;
			}
			return (...args: unknown[]) =>
				Promise.resolve(value.apply(target, args)).catch((error: unknown) => {
					throw sanitizePlaidError(error);
				});
		},
	});
}

function plaidErrorCodeOf(error: unknown) {
	if (error && typeof error === "object" && "response" in error) {
		const response = (error as { response?: { data?: { error_code?: unknown } } }).response;
		if (typeof response?.data?.error_code === "string") {
			return response.data.error_code;
		}
	}
	return null;
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

	async getLiabilities(_accessToken: string): Promise<PlaidLiabilities> {
		throw new Error("Plaid is not configured");
	}

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

	async syncTransactions(
		_accessToken: string,
		_cursor: string | null,
	): Promise<PlaidTransactionsPage> {
		throw new Error("Plaid is not configured");
	}

	async verifyWebhook(_verification: string, _rawBody: Buffer) {
		return false;
	}
}
