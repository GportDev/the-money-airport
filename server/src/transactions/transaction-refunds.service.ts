import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, lt, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { transaction } from "../db/schema/transaction";

const CANDIDATE_WINDOW_DAYS = 120;
const CANDIDATE_LIMIT = 10;

const merchantKey = sql`lower(coalesce(${transaction.merchantName}, ${transaction.name}))`;

/** Links a refund (Money in) to the expense it pays back. */
@Injectable()
export class TransactionRefundsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/** The refund takes the expense's Category, so the two net out in Budget and Reports. */
	async link(userId: string, refundId: string, originalId: string) {
		if (refundId === originalId) {
			throw new BadRequestException("A Transaction cannot refund itself");
		}
		const [refund, original] = await Promise.all([
			this.owned(userId, refundId),
			this.owned(userId, originalId),
		]);
		if (refund.amount <= 0) {
			throw new BadRequestException("A refund brings Money in");
		}
		if (original.amount >= 0) {
			throw new BadRequestException("A refund pays back an expense");
		}
		if (refund.isoCurrencyCode !== original.isoCurrencyCode) {
			throw new BadRequestException("A refund is in the same currency as its expense");
		}
		await this.db
			.update(transaction)
			.set({
				refundOfId: original.id,
				categoryId: original.categoryId,
				categoryLocked: true,
				updatedAt: new Date(),
			})
			.where(and(eq(transaction.userId, userId), eq(transaction.id, refund.id)));
	}

	async unlink(userId: string, refundId: string) {
		await this.owned(userId, refundId);
		await this.db
			.update(transaction)
			.set({ refundOfId: null, updatedAt: new Date() })
			.where(and(eq(transaction.userId, userId), eq(transaction.id, refundId)));
	}

	/** Expenses this refund may pay back: same merchant first, then the closest amount. */
	async candidateIds(userId: string, refundId: string) {
		const refund = await this.owned(userId, refundId);
		if (refund.amount <= 0) {
			return [];
		}
		const key = (refund.merchantName ?? refund.name).toLowerCase();
		const rows = await this.db
			.select({ id: transaction.id })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					ne(transaction.id, refund.id),
					lt(transaction.amount, 0),
					eq(transaction.isoCurrencyCode, refund.isoCurrencyCode),
					sql`${transaction.date} between ${refund.date}::date - ${CANDIDATE_WINDOW_DAYS}::int and ${refund.date}::date`,
				),
			)
			.orderBy(
				desc(sql`${merchantKey} = ${key}`),
				asc(sql`abs(${transaction.amount} + ${refund.amount})`),
				desc(transaction.date),
			)
			.limit(CANDIDATE_LIMIT);
		return rows.map((row) => row.id);
	}

	async refundedByIds(userId: string, originalId: string) {
		const rows = await this.db
			.select({ id: transaction.id })
			.from(transaction)
			.where(and(eq(transaction.userId, userId), eq(transaction.refundOfId, originalId)))
			.orderBy(desc(transaction.date), desc(transaction.id));
		return rows.map((row) => row.id);
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
