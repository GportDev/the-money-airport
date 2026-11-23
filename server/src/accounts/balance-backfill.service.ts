import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { bankAccount } from "../db/schema/bank-account";
import { transaction } from "../db/schema/transaction";
import { BACKFILL_GROUPS, estimatedBalances } from "./balance-backfill";

type Database = PostgresJsDatabase;
type Executor = Parameters<Parameters<Database["transaction"]>[0]>[0];

@Injectable()
export class BalanceBackfillService {
	constructor(@Inject(DATABASE) private readonly db: Database) {}

	/** Rebuilds estimated past balances for a PlaidItem's cash and credit BankAccounts. */
	async rebuild(userId: string, plaidItemRowId: string) {
		const accounts = await this.db
			.select({ id: bankAccount.id, isAsset: bankAccount.isAsset })
			.from(bankAccount)
			.where(
				and(
					eq(bankAccount.userId, userId),
					eq(bankAccount.plaidItemId, plaidItemRowId),
					inArray(bankAccount.displayGroup, [...BACKFILL_GROUPS]),
				),
			);
		for (const account of accounts) {
			await this.db.transaction((tx) => this.rebuildAccount(tx, userId, account));
		}
	}

	private async rebuildAccount(
		tx: Executor,
		userId: string,
		account: { id: string; isAsset: boolean },
	) {
		const ownSnapshots = and(
			eq(accountBalanceSnapshot.userId, userId),
			eq(accountBalanceSnapshot.bankAccountId, account.id),
		);
		await tx
			.delete(accountBalanceSnapshot)
			.where(and(ownSnapshots, eq(accountBalanceSnapshot.isEstimated, true)));

		const [anchor] = await tx
			.select({ date: accountBalanceSnapshot.date, balance: accountBalanceSnapshot.balance })
			.from(accountBalanceSnapshot)
			.where(ownSnapshots)
			.orderBy(asc(accountBalanceSnapshot.date))
			.limit(1);
		if (!anchor) {
			return;
		}

		const moves = await tx
			.select({ date: transaction.date, amount: transaction.amount })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.bankAccountId, account.id),
					eq(transaction.pending, false),
					eq(transaction.isManual, false),
					lte(transaction.date, anchor.date),
				),
			);
		const days = estimatedBalances(anchor, moves, account.isAsset);
		if (days.length === 0) {
			return;
		}
		await tx.insert(accountBalanceSnapshot).values(
			days.map((day) => ({
				userId,
				bankAccountId: account.id,
				date: day.date,
				balance: day.balance,
				isEstimated: true,
			})),
		);
	}
}
