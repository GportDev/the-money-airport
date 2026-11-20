import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { category } from "../db/schema/category";
import { transaction } from "../db/schema/transaction";
import type { SplitPartInput, TransactionSplit } from "./transactions.types";

type TransactionRow = typeof transaction.$inferSelect;

/**
 * Splits one Transaction into parts with their own Category and amount. The original row
 * keeps the first part; the others are child rows. Every total stays a plain sum of rows.
 */
@Injectable()
export class TransactionSplitsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly categories: CategoriesService,
	) {}

	/** Replaces the split (or splits a whole Transaction). Returns the parent id. */
	async split(userId: string, id: string, parts: SplitPartInput[]) {
		const parent = await this.parentOf(userId, id);
		const children = await this.childrenOf(userId, parent.id);
		const total = sumAmounts([parent, ...children]);
		await this.assertValidParts(userId, parts, total);

		const [first, ...rest] = parts as [SplitPartInput, ...SplitPartInput[]];
		await this.db.transaction(async (tx) => {
			await tx
				.delete(transaction)
				.where(and(eq(transaction.userId, userId), eq(transaction.splitParentId, parent.id)));
			await tx
				.update(transaction)
				.set({
					categoryId: first.categoryId,
					categoryLocked: true,
					amount: first.amount,
					updatedAt: new Date(),
				})
				.where(and(eq(transaction.userId, userId), eq(transaction.id, parent.id)));
			const now = Date.now();
			await tx
				.insert(transaction)
				.values(rest.map((part, index) => childRow(parent, part, new Date(now + index))));
		});
		return parent.id;
	}

	/** Folds the parts back into the parent row. Returns the parent id. */
	async unsplit(userId: string, id: string) {
		const parent = await this.parentOf(userId, id);
		const children = await this.childrenOf(userId, parent.id);
		if (children.length === 0) {
			throw new BadRequestException("This Transaction is not split");
		}
		await this.db.transaction(async (tx) => {
			await tx
				.delete(transaction)
				.where(and(eq(transaction.userId, userId), eq(transaction.splitParentId, parent.id)));
			await tx
				.update(transaction)
				.set({ amount: sumAmounts([parent, ...children]), updatedAt: new Date() })
				.where(and(eq(transaction.userId, userId), eq(transaction.id, parent.id)));
		});
		return parent.id;
	}

	/** The split a row belongs to, parent part first, or null when it is not split. */
	async forTransaction(userId: string, row: TransactionRow): Promise<TransactionSplit | null> {
		const parentId = row.splitParentId ?? row.id;
		const parts = await this.db
			.select({
				id: transaction.id,
				amount: transaction.amount,
				splitParentId: transaction.splitParentId,
				category: {
					id: category.id,
					name: category.name,
					icon: category.icon,
					color: category.color,
				},
			})
			.from(transaction)
			.leftJoin(category, eq(transaction.categoryId, category.id))
			.where(
				and(
					eq(transaction.userId, userId),
					or(eq(transaction.id, parentId), eq(transaction.splitParentId, parentId)),
				),
			)
			.orderBy(asc(transaction.createdAt), asc(transaction.id));
		if (parts.length < 2) {
			return null;
		}
		const ordered = [
			...parts.filter((part) => part.splitParentId === null),
			...parts.filter((part) => part.splitParentId !== null),
		];
		return {
			parentId,
			total: sumAmounts(ordered),
			parts: ordered.map(({ id: partId, amount, category: partCategory }) => ({
				id: partId,
				amount,
				category: partCategory,
			})),
		};
	}

	private async assertValidParts(userId: string, parts: SplitPartInput[], total: number) {
		if (total === 0) {
			throw new BadRequestException("A Transaction of 0 cannot be split");
		}
		const sign = Math.sign(total);
		if (parts.some((part) => Math.sign(part.amount) !== sign)) {
			throw new BadRequestException("Every part must be above 0 and go the same way as the total");
		}
		if (sumAmounts(parts) !== total) {
			throw new BadRequestException("The parts must add up to the Transaction amount");
		}
		const lookup = await this.categories.lookup(userId);
		if (parts.some((part) => !lookup.byId.has(part.categoryId))) {
			throw new BadRequestException("Category not found");
		}
	}

	private async parentOf(userId: string, id: string) {
		const row = await this.owned(userId, id);
		return row.splitParentId ? this.owned(userId, row.splitParentId) : row;
	}

	private childrenOf(userId: string, parentId: string) {
		return this.db
			.select()
			.from(transaction)
			.where(and(eq(transaction.userId, userId), eq(transaction.splitParentId, parentId)));
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
}

function sumAmounts(rows: { amount: number }[]) {
	return rows.reduce((sum, row) => sum + row.amount, 0);
}

/** A child part copies what the feed shows; Plaid ids and categories stay on the parent. */
function childRow(parent: TransactionRow, part: SplitPartInput, createdAt: Date) {
	return {
		userId: parent.userId,
		bankAccountId: parent.bankAccountId,
		categoryId: part.categoryId,
		splitParentId: parent.id,
		name: parent.name,
		merchantName: parent.merchantName,
		merchantLogoUrl: parent.merchantLogoUrl,
		amount: part.amount,
		isoCurrencyCode: parent.isoCurrencyCode,
		date: parent.date,
		pending: parent.pending,
		tags: parent.tags,
		tagsLocked: parent.tagsLocked,
		categoryLocked: true,
		// Parts are listed by `createdAt`, so each one gets its own instant in the order given.
		createdAt,
	};
}
