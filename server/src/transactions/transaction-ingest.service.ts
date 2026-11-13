import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { categoryNameForPlaid, SAVINGS_TRANSFER } from "../categories/category-defaults";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { transaction } from "../db/schema/transaction";
import type { PlaidTransactionSnapshot, PlaidTransactionsPage } from "../plaid/plaid.port";

const TRANSFER_PFC = ["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"];
const PAIR_WINDOW_DAYS = 3;

export type IngestResult = { added: number; modified: number; removed: number };

@Injectable()
export class TransactionIngestService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly categories: CategoriesService,
	) {}

	/**
	 * Applies one /transactions/sync result for a PlaidItem.
	 * Order matters: added rows can replace pending rows that `removed` then names.
	 */
	async apply(userId: string, plaidItemRowId: string, page: PlaidTransactionsPage) {
		const accounts = await this.db
			.select({
				id: bankAccount.id,
				plaidAccountId: bankAccount.plaidAccountId,
				isoCurrencyCode: bankAccount.isoCurrencyCode,
			})
			.from(bankAccount)
			.where(and(eq(bankAccount.userId, userId), eq(bankAccount.plaidItemId, plaidItemRowId)));
		const accountByPlaidId = new Map(
			accounts.filter((row) => row.plaidAccountId).map((row) => [row.plaidAccountId, row]),
		);
		const lookup = await this.categories.lookup(userId);
		const categoryFor = (tx: PlaidTransactionSnapshot) => {
			const name = categoryNameForPlaid(tx.pfcPrimary, tx.pfcDetailed);
			return (name && lookup.byName.get(name.toLowerCase())?.id) || lookup.uncategorized.id;
		};

		const incoming = [...page.added, ...page.modified];
		const ids = new Set<string>();
		for (const tx of incoming) {
			ids.add(tx.plaidTransactionId);
			if (tx.pendingTransactionId) {
				ids.add(tx.pendingTransactionId);
			}
		}
		const existingRows =
			ids.size === 0
				? []
				: await this.db
						.select()
						.from(transaction)
						.where(
							and(
								eq(transaction.userId, userId),
								inArray(transaction.plaidTransactionId, [...ids]),
							),
						);
		const existing = new Map(existingRows.map((row) => [row.plaidTransactionId, row]));

		const result: IngestResult = { added: 0, modified: 0, removed: 0 };
		await this.db.transaction(async (tx) => {
			for (const item of incoming) {
				const account = accountByPlaidId.get(item.plaidAccountId);
				if (!account) {
					continue;
				}
				// A posted row replaces its pending row in place, so the User's edits survive.
				const current =
					existing.get(item.plaidTransactionId) ??
					(item.pendingTransactionId ? existing.get(item.pendingTransactionId) : undefined);
				const fields = {
					bankAccountId: account.id,
					plaidTransactionId: item.plaidTransactionId,
					pendingTransactionId: item.pendingTransactionId,
					name: item.name,
					merchantName: item.merchantName,
					merchantLogoUrl: item.logoUrl,
					amount: item.amount,
					isoCurrencyCode: item.isoCurrencyCode ?? account.isoCurrencyCode,
					date: item.date,
					pending: item.pending,
					plaidCategory: item.legacyCategory,
					plaidPfcPrimary: item.pfcPrimary,
					plaidPfcDetailed: item.pfcDetailed,
					updatedAt: new Date(),
				};
				if (current) {
					await tx
						.update(transaction)
						.set({
							...fields,
							...(current.categoryLocked ? {} : { categoryId: categoryFor(item) }),
						})
						.where(eq(transaction.id, current.id));
					existing.set(item.plaidTransactionId, { ...current, ...fields });
					result.modified += 1;
				} else {
					const [created] = await tx
						.insert(transaction)
						.values({ ...fields, userId, categoryId: categoryFor(item) })
						.onConflictDoNothing({
							target: [transaction.userId, transaction.plaidTransactionId],
						})
						.returning();
					if (created) {
						existing.set(item.plaidTransactionId, created);
						result.added += 1;
					}
				}
			}

			// A pending row that was just renamed to its posted id no longer matches here.
			const removable = page.removed;
			if (removable.length > 0) {
				const deleted = await tx
					.delete(transaction)
					.where(
						and(eq(transaction.userId, userId), inArray(transaction.plaidTransactionId, removable)),
					)
					.returning({ id: transaction.id });
				result.removed = deleted.length;
			}
		});

		await this.pairTransfers(userId);
		return result;
	}

	/**
	 * Tags internal moves between the User's own BankAccounts so totals skip them.
	 * Pairs opposite-sign, equal-size, same-currency rows on different accounts within
	 * three days, where Plaid called both a transfer or loan payment.
	 */
	async pairTransfers(userId: string) {
		const candidates = await this.db
			.select({
				id: transaction.id,
				bankAccountId: transaction.bankAccountId,
				amount: transaction.amount,
				isoCurrencyCode: transaction.isoCurrencyCode,
				date: transaction.date,
				categoryId: transaction.categoryId,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.tagsLocked, false),
					isNotNull(transaction.bankAccountId),
					inArray(transaction.plaidPfcPrimary, TRANSFER_PFC),
					sql`cardinality(${transaction.tags}) = 0`,
				),
			);
		if (candidates.length < 2) {
			return 0;
		}
		const lookup = await this.categories.lookup(userId);
		const savingsId = lookup.byName.get(SAVINGS_TRANSFER.toLowerCase())?.id;

		const outflows = candidates
			.filter((row) => row.amount < 0)
			.sort((a, b) => a.date.localeCompare(b.date));
		const inflows = candidates.filter((row) => row.amount > 0);
		const used = new Set<string>();
		const pairs: { ids: [string, string]; tag: "transfer" | "savings_transfer" }[] = [];

		for (const out of outflows) {
			let best: (typeof inflows)[number] | null = null;
			let bestGap = Number.POSITIVE_INFINITY;
			for (const inc of inflows) {
				if (
					used.has(inc.id) ||
					inc.bankAccountId === out.bankAccountId ||
					inc.isoCurrencyCode !== out.isoCurrencyCode ||
					inc.amount !== -out.amount
				) {
					continue;
				}
				const gap = Math.abs(dayDiff(inc.date, out.date));
				if (gap <= PAIR_WINDOW_DAYS && gap < bestGap) {
					best = inc;
					bestGap = gap;
				}
			}
			if (!best) {
				continue;
			}
			used.add(best.id);
			const savings =
				savingsId !== undefined && (out.categoryId === savingsId || best.categoryId === savingsId);
			pairs.push({ ids: [out.id, best.id], tag: savings ? "savings_transfer" : "transfer" });
		}

		for (const pair of pairs) {
			await this.db
				.update(transaction)
				.set({ tags: [pair.tag], updatedAt: new Date() })
				.where(and(eq(transaction.userId, userId), inArray(transaction.id, pair.ids)));
		}
		return pairs.length;
	}
}

function dayDiff(a: string, b: string) {
	return (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}
