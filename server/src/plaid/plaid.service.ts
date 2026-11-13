import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { decryptToken, encryptToken } from "../crypto/token-crypto";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { plaidItem } from "../db/schema/plaid-item";
import { OneOffsService } from "../forecast/one-offs.service";
import { FundInterestService } from "../goals/fund-interest.service";
import {
	type IngestResult,
	TransactionIngestService,
} from "../transactions/transaction-ingest.service";
import { PLAID_PORT, type PlaidPort } from "./plaid.port";

type PlaidWebhook = {
	webhook_type?: string;
	webhook_code?: string;
	item_id?: string;
	error?: { error_code?: string } | null;
};

@Injectable()
export class PlaidService {
	private readonly logger = new Logger(PlaidService.name);

	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		@Inject(PLAID_PORT) private readonly plaid: PlaidPort,
		private readonly config: ConfigService,
		private readonly accounts: AccountsService,
		private readonly ingest: TransactionIngestService,
		private readonly fundInterest: FundInterestService,
		private readonly oneOffs: OneOffsService,
	) {}

	async createLinkToken(userId: string, itemId?: string) {
		if (!this.plaid.configured) {
			throw new BadRequestException("Plaid is not configured");
		}
		let accessToken: string | undefined;
		if (itemId) {
			const item = await this.ownedItem(userId, itemId);
			accessToken = this.decrypt(item.accessToken);
		}
		return { linkToken: await this.plaid.createLinkToken(userId, accessToken) };
	}

	async exchange(userId: string, publicToken: string, institutionName?: string) {
		if (!this.plaid.configured) {
			throw new BadRequestException("Plaid is not configured");
		}
		let exchanged: { accessToken: string; itemId: string };
		try {
			exchanged = await this.plaid.exchangePublicToken(publicToken);
		} catch (error) {
			if (plaidErrorCode(error) === "INVALID_PUBLIC_TOKEN") {
				throw new BadRequestException("Invalid public token");
			}
			throw error;
		}
		const { accessToken, itemId } = exchanged;
		const details = await this.plaid.getAccounts(accessToken);
		const encrypted = encryptToken(accessToken, this.encryptionKey());
		const existing = await this.itemByPlaidId(userId, itemId);

		let item = existing;
		if (item) {
			const [updated] = await this.db
				.update(plaidItem)
				.set({
					accessToken: encrypted,
					institutionId: details.institutionId,
					institutionName: details.institutionName ?? institutionName ?? item.institutionName,
					institutionLogo: details.institutionLogo,
					status: "active",
					errorCode: null,
					lastSyncedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(plaidItem.id, item.id))
				.returning();
			item = updated ?? item;
		} else {
			const [created] = await this.db
				.insert(plaidItem)
				.values({
					userId,
					plaidItemId: itemId,
					accessToken: encrypted,
					institutionId: details.institutionId,
					institutionName: details.institutionName ?? institutionName ?? null,
					institutionLogo: details.institutionLogo,
					status: "active",
					lastSyncedAt: new Date(),
				})
				.returning();
			item = created;
		}
		if (!item) {
			throw new BadRequestException("Could not store PlaidItem");
		}

		for (const account of details.accounts) {
			await this.upsertAccount(userId, item.id, account);
		}
		// First pull. Plaid may still be preparing history; the webhook or Refresh all fills the rest.
		try {
			await this.syncTransactions(item);
		} catch (error) {
			this.logger.warn(`Initial transactions sync failed: ${plaidErrorCode(error)}`);
		}

		const accounts = (await this.accounts.list(userId)).filter(
			(row) => row.source === "plaid" && row.institutionName === item.institutionName,
		);
		return { item: { id: item.id, institutionName: item.institutionName }, accounts };
	}

	decrypt(accessToken: string) {
		return decryptToken(accessToken, this.encryptionKey());
	}

	async syncItem(userId: string, itemRowId: string) {
		const item = await this.ownedItem(userId, itemRowId);
		if (item.status === "disconnected") {
			return { ok: true, skipped: true, added: 0, modified: 0, removed: 0 };
		}
		const result = await this.refreshItem(item);
		return { ok: true, skipped: false, ...result };
	}

	async syncAll(userId: string) {
		const items = await this.db.select().from(plaidItem).where(eq(plaidItem.userId, userId));
		let count = 0;
		for (const item of items) {
			if (item.status === "disconnected") {
				continue;
			}
			try {
				await this.refreshItem(item);
				count += 1;
			} catch {
				// Keep going so one dead PlaidItem does not stop the rest.
			}
		}
		return { items: count };
	}

	async disconnect(userId: string, itemRowId: string) {
		const item = await this.ownedItem(userId, itemRowId);
		await this.db
			.update(plaidItem)
			.set({ status: "disconnected", updatedAt: new Date() })
			.where(eq(plaidItem.id, item.id));
		return { success: true };
	}

	async reconnect(userId: string, itemRowId: string) {
		const item = await this.ownedItem(userId, itemRowId);
		await this.db
			.update(plaidItem)
			.set({ status: "active", errorCode: null, updatedAt: new Date() })
			.where(eq(plaidItem.id, item.id));
		await this.refreshItem({ ...item, status: "active" });
		return { success: true };
	}

	async handleWebhook(verification: string | undefined, rawBody: Buffer | undefined) {
		if (!verification || !Buffer.isBuffer(rawBody)) {
			throw new BadRequestException("Invalid Plaid webhook");
		}
		if (!(await this.plaid.verifyWebhook(verification, rawBody))) {
			throw new BadRequestException("Invalid Plaid webhook");
		}
		let body: PlaidWebhook;
		try {
			body = JSON.parse(rawBody.toString("utf8")) as PlaidWebhook;
		} catch {
			throw new BadRequestException("Invalid Plaid webhook");
		}
		if (!body.item_id) {
			return { received: true };
		}
		const [item] = await this.db
			.select()
			.from(plaidItem)
			.where(eq(plaidItem.plaidItemId, body.item_id))
			.limit(1);
		if (!item || item.status === "disconnected") {
			return { received: true };
		}
		if (body.webhook_type === "ITEM" && body.webhook_code === "ERROR") {
			await this.db
				.update(plaidItem)
				.set({ errorCode: body.error?.error_code ?? "ITEM_ERROR", updatedAt: new Date() })
				.where(eq(plaidItem.id, item.id));
			return { received: true };
		}
		try {
			await this.refreshItem(item);
		} catch (error) {
			// Plaid retries non-2xx webhooks; the error is already stored on the PlaidItem.
			this.logger.warn(`Webhook refresh failed: ${plaidErrorCode(error)}`);
		}
		return { received: true };
	}

	private async refreshItem(item: typeof plaidItem.$inferSelect): Promise<IngestResult> {
		const accessToken = this.decrypt(item.accessToken);
		try {
			const details = await this.plaid.getAccounts(accessToken);
			for (const account of details.accounts) {
				await this.upsertAccount(item.userId, item.id, account);
			}
			const result = await this.syncTransactions(item, accessToken);
			await this.db
				.update(plaidItem)
				.set({
					lastSyncedAt: new Date(),
					updatedAt: new Date(),
					status: "active",
					errorCode: null,
				})
				.where(eq(plaidItem.id, item.id));
			return result;
		} catch (error) {
			const errorCode = plaidErrorCode(error);
			await this.db
				.update(plaidItem)
				.set({ errorCode, updatedAt: new Date() })
				.where(eq(plaidItem.id, item.id));
			if (errorCode !== "ITEM_LOGIN_REQUIRED") {
				throw error;
			}
			return { added: 0, modified: 0, removed: 0 };
		}
	}

	/** Pulls changes since the stored cursor, applies them, then saves the new cursor. */
	private async syncTransactions(item: typeof plaidItem.$inferSelect, accessToken?: string) {
		const [fresh] = await this.db
			.select({ cursor: plaidItem.cursor })
			.from(plaidItem)
			.where(eq(plaidItem.id, item.id))
			.limit(1);
		const cursor = fresh?.cursor ?? null;
		const page = await this.plaid.syncTransactions(
			accessToken ?? this.decrypt(item.accessToken),
			cursor,
		);
		const result = await this.ingest.apply(item.userId, item.id, page);
		await this.fundInterest.split(item.userId);
		await this.oneOffs.matchAfterSync(item.userId);
		await this.db
			.update(plaidItem)
			.set({ cursor: page.nextCursor || cursor, updatedAt: new Date() })
			.where(eq(plaidItem.id, item.id));
		return result;
	}

	private async ownedItem(userId: string, id: string) {
		const [item] = await this.db
			.select()
			.from(plaidItem)
			.where(and(eq(plaidItem.id, id), eq(plaidItem.userId, userId)))
			.limit(1);
		if (!item) {
			throw new BadRequestException("PlaidItem not found");
		}
		return item;
	}

	private encryptionKey() {
		const key = this.config.get<string>("ENCRYPTION_KEY");
		if (!key) {
			throw new BadRequestException("ENCRYPTION_KEY is required");
		}
		return key;
	}

	private async itemByPlaidId(userId: string, plaidItemId: string) {
		const [row] = await this.db
			.select()
			.from(plaidItem)
			.where(and(eq(plaidItem.userId, userId), eq(plaidItem.plaidItemId, plaidItemId)))
			.limit(1);
		return row ?? null;
	}

	private async upsertAccount(
		userId: string,
		plaidItemRowId: string,
		account: {
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
		},
	) {
		const [existing] = await this.db
			.select()
			.from(bankAccount)
			.where(
				and(eq(bankAccount.plaidAccountId, account.plaidAccountId), eq(bankAccount.userId, userId)),
			)
			.limit(1);

		if (existing) {
			await this.db
				.update(bankAccount)
				.set({
					name: account.name,
					officialName: account.officialName,
					currentBalance: account.currentBalance,
					availableBalance: account.availableBalance,
					creditLimit: account.creditLimit,
					isoCurrencyCode: account.isoCurrencyCode,
					lastSyncedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(bankAccount.id, existing.id));
			await this.accounts.upsertSnapshot(userId, existing.id, account.currentBalance);
			return;
		}

		const [created] = await this.db
			.insert(bankAccount)
			.values({
				userId,
				plaidItemId: plaidItemRowId,
				plaidAccountId: account.plaidAccountId,
				source: "plaid",
				name: account.name,
				officialName: account.officialName,
				displayGroup: account.displayGroup,
				type: account.type,
				subtype: account.subtype,
				mask: account.mask,
				currentBalance: account.currentBalance,
				availableBalance: account.availableBalance,
				creditLimit: account.creditLimit,
				isoCurrencyCode: account.isoCurrencyCode,
				isAsset: account.isAsset,
				lastSyncedAt: new Date(),
			})
			.returning();
		if (created) {
			await this.accounts.upsertSnapshot(userId, created.id, created.currentBalance);
		}
	}
}

function plaidErrorCode(error: unknown) {
	if (
		error &&
		typeof error === "object" &&
		"response" in error &&
		error.response &&
		typeof error.response === "object" &&
		"data" in error.response &&
		error.response.data &&
		typeof error.response.data === "object" &&
		"error_code" in error.response.data &&
		typeof error.response.data.error_code === "string"
	) {
		return error.response.data.error_code;
	}
	if (error instanceof Error && error.message.includes("ITEM_LOGIN_REQUIRED")) {
		return "ITEM_LOGIN_REQUIRED";
	}
	return "ITEM_ERROR";
}
