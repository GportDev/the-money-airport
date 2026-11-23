import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { transaction } from "../db/schema/transaction";
import { todayIso } from "../forecast/dates";
import { notTransfer } from "../liabilities/liability-details";
import { benefitsDto } from "./benefits-dto";
import { billingPeriod } from "./billing-period";
import { periodBounds } from "./calendar-periods";
import type { CreditCardDto } from "./card-benefits.types";
import { type CreditAccountRow, creditAccounts } from "./credit-accounts";
import type { RewardTransaction } from "./earn-rules";
import { rewardsTracking } from "./rewards-tracking";

@Injectable()
export class CreditCardsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/**
	 * The User's visible credit BankAccounts in their saved order (then by name), with their
	 * billing period, Card benefits, and Rewards earned.
	 */
	async list(userId: string): Promise<CreditCardDto[]> {
		const today = todayIso();
		const rows = (await creditAccounts(this.db, userId))
			.filter((row) => !row.account.isHidden)
			.sort(bySortOrder);
		const withBenefits = rows.filter((row) => row.benefits).map((row) => row.account.id);
		const spending = await this.yearTransactions(userId, withBenefits, today);
		return Promise.all(
			rows.map(async (row) =>
				creditCardDto(
					row,
					await billingPeriod(this.db, userId, row.account, today),
					spending.get(row.account.id) ?? [],
					today,
				),
			),
		);
	}

	/** Saves the Credit Cards page order; ids that are not the User's credit cards are ignored. */
	async reorder(userId: string, accountIds: string[]): Promise<{ success: true }> {
		await this.db.transaction(async (tx) => {
			for (const [index, id] of accountIds.entries()) {
				await tx
					.update(bankAccount)
					.set({ sortOrder: index })
					.where(
						and(
							eq(bankAccount.id, id),
							eq(bankAccount.userId, userId),
							eq(bankAccount.displayGroup, "credit"),
						),
					);
			}
		});
		return { success: true };
	}

	/** Each card's non-Transfer Transactions from January 1 through `today`, in date order. */
	private async yearTransactions(userId: string, accountIds: string[], today: string) {
		const byCard = new Map<string, RewardTransaction[]>();
		if (accountIds.length === 0) return byCard;
		const rows = await this.db
			.select({
				bankAccountId: transaction.bankAccountId,
				amount: transaction.amount,
				date: transaction.date,
				name: transaction.name,
				merchantName: transaction.merchantName,
				plaidPfcDetailed: transaction.plaidPfcDetailed,
				plaidPfcPrimary: transaction.plaidPfcPrimary,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					inArray(transaction.bankAccountId, accountIds),
					gte(transaction.date, periodBounds(today, "year").start),
					lte(transaction.date, today),
					notTransfer,
				),
			)
			.orderBy(asc(transaction.date), asc(transaction.id));
		for (const row of rows) {
			if (!row.bankAccountId) continue;
			const ofCard = byCard.get(row.bankAccountId) ?? [];
			ofCard.push(row);
			byCard.set(row.bankAccountId, ofCard);
		}
		return byCard;
	}
}

/** Stable, so cards without a saved place keep the name order `creditAccounts` gives. */
function bySortOrder(a: CreditAccountRow, b: CreditAccountRow) {
	const unordered = Number.MAX_SAFE_INTEGER;
	return (a.account.sortOrder ?? unordered) - (b.account.sortOrder ?? unordered);
}

function creditCardDto(
	row: CreditAccountRow,
	billing: CreditCardDto["billingPeriod"],
	yearTransactions: RewardTransaction[],
	today: string,
): CreditCardDto {
	const { account } = row;
	const benefits = row.benefits && benefitsDto(row.benefits);
	const limit = account.creditLimit || null;
	return {
		id: account.id,
		name: account.name,
		officialName: account.officialName,
		mask: account.mask,
		institutionName: row.institutionName,
		institutionLogo: row.institutionLogo,
		isoCurrencyCode: account.isoCurrencyCode,
		currentBalance: account.currentBalance,
		availableCredit: account.availableBalance ?? (limit ? limit - account.currentBalance : null),
		creditLimit: account.creditLimit,
		utilization: limit ? account.currentBalance / limit : null,
		aprBps: account.aprBps,
		billingPeriod: billing,
		benefits,
		rewards: benefits && rewardsTracking(benefits, yearTransactions, today),
	};
}
