import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { goal, goalFundEntry } from "../db/schema/goal";
import { transaction } from "../db/schema/transaction";

const INTEREST_PFC = "INCOME_INTEREST_EARNED";

type InterestTransaction = { id: string; hostId: string; amount: number; date: string };

/**
 * Splits `amount` by each share's weight, flooring to the cent; rounding cents go to the
 * largest share so the parts always add up to `amount`.
 */
export function splitProRata(amount: number, weights: { id: string; weight: number }[]) {
	const total = weights.reduce((sum, row) => sum + row.weight, 0);
	const parts = weights.map((row) => ({
		id: row.id,
		amount: Math.floor((amount * row.weight) / total),
	}));
	const largest = weights.reduce((best, row) => (row.weight > best.weight ? row : best));
	const leftover = amount - parts.reduce((sum, row) => sum + row.amount, 0);
	return parts.map((row) =>
		row.id === largest.id ? { ...row, amount: row.amount + leftover } : row,
	);
}

@Injectable()
export class FundInterestService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/**
	 * Gives each new interest Transaction on a Fund host to that host's Funds, pro rata by
	 * their balance at the start of the Transaction's month. Funds with no balance then get
	 * nothing; if none had one, the interest stays Unassigned. A split Transaction is never
	 * split again.
	 */
	async split(userId: string) {
		const pending = await this.unsplitInterest(userId);
		for (const tx of pending) {
			const weights = await this.monthStartBalances(userId, tx.hostId, `${tx.date.slice(0, 8)}01`);
			if (weights.length === 0) {
				continue;
			}
			const parts = splitProRata(tx.amount, weights).filter((part) => part.amount > 0);
			await this.db
				.insert(goalFundEntry)
				.values(
					parts.map((part) => ({
						userId,
						goalId: part.id,
						date: tx.date,
						amount: part.amount,
						kind: "interest",
						transactionId: tx.id,
					})),
				)
				.onConflictDoNothing();
		}
	}

	private async unsplitInterest(userId: string): Promise<InterestTransaction[]> {
		const hosts = await this.db
			.selectDistinct({ id: goal.hostBankAccountId })
			.from(goal)
			.where(and(eq(goal.userId, userId), eq(goal.funding, "fund")));
		const hostIds = hosts.flatMap((row) => (row.id ? [row.id] : []));
		if (hostIds.length === 0) {
			return [];
		}
		const rows = await this.db
			.select({
				id: transaction.id,
				hostId: transaction.bankAccountId,
				amount: transaction.amount,
				date: transaction.date,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.plaidPfcDetailed, INTEREST_PFC),
					eq(transaction.pending, false),
					gt(transaction.amount, 0),
					inArray(transaction.bankAccountId, hostIds),
					sql`not exists (select 1 from ${goalFundEntry} where ${goalFundEntry.transactionId} = ${transaction.id})`,
				),
			);
		return rows.flatMap((row) => (row.hostId ? [{ ...row, hostId: row.hostId }] : []));
	}

	private async monthStartBalances(userId: string, hostId: string, monthStart: string) {
		const rows = await this.db
			.select({
				id: goal.id,
				weight: sql<string>`coalesce(sum(${goalFundEntry.amount}) filter (where ${lt(goalFundEntry.date, monthStart)}), 0)`,
			})
			.from(goal)
			.leftJoin(goalFundEntry, eq(goalFundEntry.goalId, goal.id))
			.where(and(eq(goal.userId, userId), eq(goal.hostBankAccountId, hostId)))
			.groupBy(goal.id);
		return rows
			.map((row) => ({ id: row.id, weight: Number(row.weight) }))
			.filter((row) => row.weight > 0);
	}
}
