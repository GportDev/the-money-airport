import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, lte, ne, or, type SQL, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type BetterCardFinder, betterCardFinder } from "../card-benefits/better-card-finder";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { category } from "../db/schema/category";
import { plaidItem } from "../db/schema/plaid-item";
import { transaction } from "../db/schema/transaction";
import { userSettings } from "../db/schema/user-settings";
import { FundEntriesService } from "../goals/fund-entries.service";
import { tagsAfterRecategorize, tagsAfterRecategorizeSql } from "./category-tags";
import { TransactionMerchantsService } from "./transaction-merchants.service";
import { TransactionRefundsService } from "./transaction-refunds.service";
import { TransactionSplitsService } from "./transaction-splits.service";
import type {
	TransactionDetail,
	TransactionFilters,
	TransactionListItem,
	TransferTag,
} from "./transactions.types";

const SIMILAR_LIMIT = 5;

@Injectable()
export class TransactionsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly categories: CategoriesService,
		private readonly fundEntries: FundEntriesService,
		private readonly splits: TransactionSplitsService,
		private readonly refunds: TransactionRefundsService,
		private readonly merchants: TransactionMerchantsService,
	) {}

	async list(userId: string, filters: TransactionFilters) {
		await this.categories.ensureDefaults(userId);
		const where: SQL[] = [eq(transaction.userId, userId)];
		if (filters.dateFrom) {
			where.push(gte(transaction.date, filters.dateFrom));
		}
		if (filters.dateTo) {
			where.push(lte(transaction.date, filters.dateTo));
		}
		if (filters.accountIds.length > 0) {
			where.push(inArray(transaction.bankAccountId, filters.accountIds));
		}
		if (filters.categoryIds.length > 0) {
			where.push(inArray(transaction.categoryId, filters.categoryIds));
		}
		if (filters.pending !== undefined) {
			where.push(eq(transaction.pending, filters.pending));
		}
		if (filters.amountMin !== undefined) {
			where.push(sql`abs(${transaction.amount}) >= ${filters.amountMin}`);
		}
		if (filters.amountMax !== undefined) {
			where.push(sql`abs(${transaction.amount}) <= ${filters.amountMax}`);
		}
		if (filters.search) {
			const pattern = `%${filters.search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
			const match = or(
				sql`${transaction.name} ilike ${pattern}`,
				sql`${transaction.merchantName} ilike ${pattern}`,
				sql`${transaction.notes} ilike ${pattern}`,
			);
			if (match) {
				where.push(match);
			}
		}
		if (filters.cursor) {
			const key = decodeCursor(filters.cursor);
			where.push(
				filters.sortDir === "desc"
					? sql`(${transaction.date}, ${transaction.id}) < (${key.date}::date, ${key.id}::uuid)`
					: sql`(${transaction.date}, ${transaction.id}) > (${key.date}::date, ${key.id}::uuid)`,
			);
		}
		const order =
			filters.sortDir === "desc"
				? [desc(transaction.date), desc(transaction.id)]
				: [asc(transaction.date), asc(transaction.id)];

		const rows = await this.selectItems()
			.where(and(...where))
			.orderBy(...order)
			.limit(filters.limit + 1);
		const betterCard = await betterCardFinder(this.db, userId);
		const page = rows.slice(0, filters.limit).map((row) => toListItem(row, betterCard));
		const last = page.at(-1);
		return {
			data: page,
			meta: {
				nextCursor: rows.length > filters.limit && last ? encodeCursor(last.date, last.id) : null,
				limit: filters.limit,
			},
		};
	}

	async get(userId: string, id: string): Promise<TransactionDetail> {
		const [row] = await this.selectItems()
			.where(and(eq(transaction.userId, userId), eq(transaction.id, id)))
			.limit(1);
		if (!row) {
			throw new NotFoundException("Transaction not found");
		}
		const merchant = row.tx.merchantName ?? row.tx.name;
		const similar = await this.selectItems()
			.where(
				and(
					eq(transaction.userId, userId),
					ne(transaction.id, id),
					sql`coalesce(${transaction.splitParentId}, ${transaction.id}) <> ${row.tx.splitParentId ?? id}`,
					sql`lower(coalesce(${transaction.merchantName}, ${transaction.name})) = lower(${merchant})`,
				),
			)
			.orderBy(desc(transaction.date), desc(transaction.id))
			.limit(SIMILAR_LIMIT);
		const betterCard = await betterCardFinder(this.db, userId);
		const [refundOf, refundedBy] = await Promise.all([
			row.tx.refundOfId ? this.itemsByIds(userId, [row.tx.refundOfId]) : [],
			this.refunds.refundedByIds(userId, id).then((ids) => this.itemsByIds(userId, ids)),
		]);
		return {
			...toListItem(row, betterCard),
			notes: row.tx.notes,
			plaidPfcPrimary: row.tx.plaidPfcPrimary,
			fundEntry: await this.fundEntries.forTransaction(userId, id),
			similar: similar.map((item) => toListItem(item, betterCard)),
			split: await this.splits.forTransaction(userId, row.tx),
			refund: { of: refundOf[0] ?? null, refundedBy },
		};
	}

	/** List items for `ids`, in the order given. */
	async itemsByIds(userId: string, ids: string[]): Promise<TransactionListItem[]> {
		if (ids.length === 0) {
			return [];
		}
		const rows = await this.selectItems().where(
			and(eq(transaction.userId, userId), inArray(transaction.id, ids)),
		);
		const betterCard = await betterCardFinder(this.db, userId);
		const byId = new Map(rows.map((row) => [row.tx.id, toListItem(row, betterCard)]));
		return ids.flatMap((id) => byId.get(id) ?? []);
	}

	async create(
		userId: string,
		input: {
			name: string;
			amount: number;
			date: string;
			categoryId?: string | null;
			bankAccountId?: string | null;
			notes?: string | null;
			isoCurrencyCode?: string;
		},
	) {
		const lookup = await this.categories.lookup(userId);
		const categoryId = input.categoryId ?? lookup.uncategorized.id;
		if (!lookup.byId.has(categoryId)) {
			throw new BadRequestException("Category not found");
		}
		let currency = input.isoCurrencyCode?.toUpperCase();
		if (input.bankAccountId) {
			const account = await this.ownedAccount(userId, input.bankAccountId);
			currency = account.isoCurrencyCode;
		}
		currency ??= await this.baseCurrency(userId);
		const [row] = await this.db
			.insert(transaction)
			.values({
				userId,
				bankAccountId: input.bankAccountId ?? null,
				categoryId,
				name: input.name.trim(),
				amount: input.amount,
				isoCurrencyCode: currency,
				date: input.date,
				notes: input.notes ?? null,
				tags: tagsAfterRecategorize(lookup, categoryId, categoryId, []),
				isManual: true,
				categoryLocked: input.categoryId != null,
			})
			.returning({ id: transaction.id });
		if (!row) {
			throw new BadRequestException("Could not create Transaction");
		}
		return this.get(userId, row.id);
	}

	async update(
		userId: string,
		id: string,
		input: {
			categoryId?: string;
			notes?: string | null;
			tags?: TransferTag[];
			name?: string;
			merchantName?: string | null;
			amount?: number;
			date?: string;
			bankAccountId?: string | null;
		},
	) {
		const existing = await this.owned(userId, id);
		const editsLedger =
			input.amount !== undefined || input.date !== undefined || input.bankAccountId !== undefined;
		if (editsLedger && !existing.isManual) {
			throw new BadRequestException("Only manual Transactions can change amount, date, or account");
		}
		if (editsLedger && (await this.splits.forTransaction(userId, existing))) {
			throw new BadRequestException("Unsplit this Transaction to change its amount or date");
		}
		const lookup = await this.categories.lookup(userId);
		const categoryId = input.categoryId ?? existing.categoryId;
		if (!lookup.byId.has(categoryId)) {
			throw new BadRequestException("Category not found");
		}
		let currency = existing.isoCurrencyCode;
		if (input.bankAccountId) {
			currency = (await this.ownedAccount(userId, input.bankAccountId)).isoCurrencyCode;
		}
		const tags = tagsAfterRecategorize(
			lookup,
			existing.categoryId,
			categoryId,
			input.tags ?? existing.tags,
		);
		const isTagChange = input.tags !== undefined || tags.join() !== existing.tags.join();
		const name = input.name?.trim() ?? existing.name;
		const merchant = await this.merchantFields(userId, existing, input.merchantName);

		await this.db
			.update(transaction)
			.set({
				categoryId,
				categoryLocked: input.categoryId !== undefined ? true : existing.categoryLocked,
				notes: input.notes === undefined ? existing.notes : input.notes,
				tags,
				tagsLocked: isTagChange ? true : existing.tagsLocked,
				name,
				nameLocked: existing.nameLocked || name !== existing.name,
				...merchant,
				amount: input.amount ?? existing.amount,
				date: input.date ?? existing.date,
				bankAccountId:
					input.bankAccountId === undefined ? existing.bankAccountId : input.bankAccountId,
				isoCurrencyCode: currency,
				updatedAt: new Date(),
			})
			.where(and(eq(transaction.userId, userId), eq(transaction.id, id)));
		return this.get(userId, id);
	}

	async bulkCategorize(userId: string, transactionIds: string[], categoryId: string) {
		const lookup = await this.categories.lookup(userId);
		if (!lookup.byId.has(categoryId)) {
			throw new BadRequestException("Category not found");
		}
		const tags = tagsAfterRecategorizeSql(lookup, categoryId);
		const updated = await this.db
			.update(transaction)
			.set({ categoryId, categoryLocked: true, tags, updatedAt: new Date() })
			.where(and(eq(transaction.userId, userId), inArray(transaction.id, transactionIds)))
			.returning({ id: transaction.id });
		return { updated: updated.length };
	}

	async remove(userId: string, id: string) {
		const existing = await this.owned(userId, id);
		if (!existing.isManual) {
			throw new BadRequestException("Only manual Transactions can be deleted");
		}
		await this.db
			.delete(transaction)
			.where(and(eq(transaction.userId, userId), eq(transaction.id, id)));
		return { success: true };
	}

	/** A picked merchant takes the logo it already has elsewhere; sync keeps the User's pick. */
	private async merchantFields(
		userId: string,
		existing: typeof transaction.$inferSelect,
		merchantName: string | null | undefined,
	) {
		const next = merchantName?.trim() || null;
		if (merchantName === undefined || next === existing.merchantName) {
			return {};
		}
		return {
			merchantName: next,
			merchantLogoUrl: next ? await this.merchants.logoFor(userId, next) : null,
			merchantLocked: true,
		};
	}

	private selectItems() {
		return this.db
			.select({
				tx: transaction,
				category: {
					id: category.id,
					name: category.name,
					icon: category.icon,
					color: category.color,
				},
				account: {
					id: bankAccount.id,
					name: bankAccount.name,
					mask: bankAccount.mask,
				},
				institutionLogo: plaidItem.institutionLogo,
				hasSplitParts: sql<boolean>`exists (select 1 from ${transaction} as split_part where split_part.split_parent_id = ${transaction.id})`,
			})
			.from(transaction)
			.leftJoin(category, eq(transaction.categoryId, category.id))
			.leftJoin(bankAccount, eq(transaction.bankAccountId, bankAccount.id))
			.leftJoin(plaidItem, eq(bankAccount.plaidItemId, plaidItem.id))
			.$dynamic();
	}

	private async owned(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(transaction)
			.where(and(eq(transaction.userId, userId), eq(transaction.id, id)))
			.limit(1);
		if (!row) {
			throw new NotFoundException("Transaction not found");
		}
		return row;
	}

	private async ownedAccount(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(bankAccount)
			.where(and(eq(bankAccount.userId, userId), eq(bankAccount.id, id)))
			.limit(1);
		if (!row) {
			throw new BadRequestException("BankAccount not found");
		}
		return row;
	}

	private async baseCurrency(userId: string) {
		const [row] = await this.db
			.select({ currency: userSettings.currency })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		return row?.currency ?? "USD";
	}
}

type ItemRow = {
	tx: typeof transaction.$inferSelect;
	category: { id: string; name: string; icon: string; color: string } | null;
	account: { id: string; name: string; mask: string | null } | null;
	institutionLogo: string | null;
	hasSplitParts: boolean;
};

function toListItem(row: ItemRow, betterCard: BetterCardFinder): TransactionListItem {
	return {
		id: row.tx.id,
		date: row.tx.date,
		name: row.tx.name,
		merchantName: row.tx.merchantName,
		merchantLogoUrl: row.tx.merchantLogoUrl,
		amount: row.tx.amount,
		isoCurrencyCode: row.tx.isoCurrencyCode,
		pending: row.tx.pending,
		isManual: row.tx.isManual,
		tags: row.tx.tags,
		isSplit: row.tx.splitParentId !== null || row.hasSplitParts,
		category: row.category,
		account: row.account ? { ...row.account, institutionLogo: row.institutionLogo } : null,
		betterCard: betterCard(row.tx),
		isRefund: row.tx.refundOfId !== null,
		isStatementConfirmed: row.tx.statementConfirmed,
		isNotOnStatement: row.tx.notOnStatement === true,
	};
}

function encodeCursor(date: string, id: string) {
	return Buffer.from(JSON.stringify([date, id])).toString("base64url");
}

function decodeCursor(cursor: string) {
	try {
		const [date, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown[];
		if (
			typeof date === "string" &&
			/^\d{4}-\d{2}-\d{2}$/.test(date) &&
			typeof id === "string" &&
			/^[0-9a-f-]{36}$/i.test(id)
		) {
			return { date, id };
		}
	} catch {
		// Fall through to the error below.
	}
	throw new BadRequestException("Invalid cursor");
}
