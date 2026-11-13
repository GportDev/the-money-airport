import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, lt, lte, ne, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { goal, goalFundEntry } from "../db/schema/goal";
import { transaction } from "../db/schema/transaction";
import { GoalsService } from "./goals.service";
import type { CreateFundEntryInput, FundEntryDto, FundEntryKind } from "./goals.types";

const PAGE_SIZE = 100;

type EntryRow = typeof goalFundEntry.$inferSelect;

@Injectable()
export class FundEntriesService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly goals: GoalsService,
	) {}

	/** Newest first, each with the Fund balance after it. */
	async list(userId: string, goalId: string, cursor?: string) {
		await this.ownedFund(userId, goalId);
		const rows = await this.db
			.select()
			.from(goalFundEntry)
			.where(and(eq(goalFundEntry.userId, userId), eq(goalFundEntry.goalId, goalId)))
			.orderBy(asc(goalFundEntry.date), asc(goalFundEntry.createdAt), asc(goalFundEntry.id));
		let running = 0;
		const withBalance = rows.map((row) => {
			running += row.amount;
			return toDto(row, running);
		});
		const newestFirst = withBalance.reverse();
		const start = cursor ? newestFirst.findIndex((row) => row.id === cursor) + 1 : 0;
		const page = newestFirst.slice(start, start + PAGE_SIZE);
		const last = page.at(-1);
		const hasMore = start + PAGE_SIZE < newestFirst.length;
		return { data: page, nextCursor: hasMore && last ? last.id : null };
	}

	async create(userId: string, goalId: string, input: CreateFundEntryInput) {
		const fund = await this.ownedFund(userId, goalId);
		const values =
			"transactionId" in input
				? await this.fromTransaction(userId, fund.hostBankAccountId, input.transactionId)
				: { date: input.date, amount: input.amount, kind: input.kind, transactionId: null };
		const [row] = await this.db
			.insert(goalFundEntry)
			.values({ userId, goalId, ...values, note: input.note ?? null })
			.returning();
		if (!row) {
			throw new Error("Could not save entry");
		}
		const [balance] = await this.db
			.select({ total: sql<string>`coalesce(sum(${goalFundEntry.amount}), 0)` })
			.from(goalFundEntry)
			.where(
				and(
					eq(goalFundEntry.goalId, goalId),
					or(
						lt(goalFundEntry.date, row.date),
						and(eq(goalFundEntry.date, row.date), lte(goalFundEntry.createdAt, row.createdAt)),
					),
				),
			);
		return toDto(row, Number(balance?.total ?? 0));
	}

	async remove(userId: string, goalId: string, entryId: string) {
		const [row] = await this.db
			.delete(goalFundEntry)
			.where(
				and(
					eq(goalFundEntry.id, entryId),
					eq(goalFundEntry.goalId, goalId),
					eq(goalFundEntry.userId, userId),
				),
			)
			.returning({ id: goalFundEntry.id });
		if (!row) {
			throw new NotFoundException("Entry not found");
		}
		return { success: true };
	}

	/** The Fund entry a Transaction was assigned to, if any (interest splits excluded). */
	async forTransaction(userId: string, transactionId: string) {
		const [row] = await this.db
			.select({ id: goalFundEntry.id, goalId: goal.id, goalName: goal.name })
			.from(goalFundEntry)
			.innerJoin(goal, eq(goal.id, goalFundEntry.goalId))
			.where(
				and(
					eq(goalFundEntry.userId, userId),
					eq(goalFundEntry.transactionId, transactionId),
					ne(goalFundEntry.kind, "interest"),
				),
			)
			.limit(1);
		return row ?? null;
	}

	private async ownedFund(userId: string, goalId: string) {
		const row = await this.goals.owned(userId, goalId);
		if (row.funding !== "fund") {
			throw new BadRequestException("Only Funds have entries");
		}
		return row;
	}

	private async fromTransaction(userId: string, hostId: string | null, transactionId: string) {
		const [tx] = await this.db
			.select()
			.from(transaction)
			.where(and(eq(transaction.id, transactionId), eq(transaction.userId, userId)))
			.limit(1);
		if (!tx) {
			throw new NotFoundException("Transaction not found");
		}
		if (tx.bankAccountId !== hostId || tx.amount === 0) {
			throw new BadRequestException("Only a Transaction on the Fund's host can be assigned");
		}
		const [used] = await this.db
			.select({ id: goalFundEntry.id })
			.from(goalFundEntry)
			.where(eq(goalFundEntry.transactionId, transactionId))
			.limit(1);
		if (used) {
			throw new BadRequestException("That Transaction is already in a Fund");
		}
		const kind: FundEntryKind = tx.amount > 0 ? "deposit" : "withdrawal";
		return { date: tx.date, amount: tx.amount, kind, transactionId };
	}
}

function toDto(row: EntryRow, balanceAfter: number): FundEntryDto {
	return {
		id: row.id,
		date: row.date,
		amount: row.amount,
		kind: row.kind as FundEntryKind,
		transactionId: row.transactionId,
		note: row.note,
		balanceAfter,
	};
}
