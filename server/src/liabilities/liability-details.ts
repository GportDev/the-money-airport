import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { bankAccount } from "../db/schema/bank-account";
import { cardStatement } from "../db/schema/card-statement";
import { loanTerms } from "../db/schema/loan-terms";
import { transaction } from "../db/schema/transaction";
import { monthlyInterest, scheduledPayment } from "../debt/amortization";
import { cardPayment, type PaymentRule } from "../debt/card-payment";
import type { CardStatementDto, CardSummary, LoanTermsDto } from "./liabilities.types";

type Account = typeof bankAccount.$inferSelect;

export const notTransfer = sql`not (${transaction.tags} && array['transfer','savings_transfer']::text[])`;

/**
 * Card summaries and Loan terms for the User's liabilities, keyed by BankAccount id.
 * CONVENTION-DEVIATION: a plain query function, like `fundsByHost`, so AccountsService can show
 * them without AccountsModule and LiabilitiesModule importing each other.
 */
export async function liabilityDetails(
	db: PostgresJsDatabase,
	userId: string,
	accounts: Account[],
) {
	const cards = new Map<string, CardSummary>();
	const loans = new Map<string, LoanTermsDto>();
	for (const account of accounts) {
		if (account.displayGroup === "credit") {
			cards.set(account.id, await cardSummary(db, userId, account));
		}
	}
	const terms = await db.select().from(loanTerms).where(eq(loanTerms.userId, userId));
	for (const row of terms) {
		const account = accounts.find((entry) => entry.id === row.bankAccountId);
		if (account) loans.set(account.id, loanTermsDto(row, account));
	}
	return { cards, loans };
}

export async function latestStatement(db: PostgresJsDatabase, userId: string, accountId: string) {
	const [row] = await db
		.select()
		.from(cardStatement)
		.where(and(eq(cardStatement.userId, userId), eq(cardStatement.bankAccountId, accountId)))
		.orderBy(desc(cardStatement.periodEnd))
		.limit(1);
	return row ? statementDto(row) : null;
}

/** Native charges net of refunds after `since`, Transfers left out; never below 0. */
export async function spendSince(
	db: PostgresJsDatabase,
	userId: string,
	accountId: string,
	since: string,
) {
	const [row] = await db
		.select({ total: sql<string>`coalesce(sum(${transaction.amount}), 0)` })
		.from(transaction)
		.where(
			and(
				eq(transaction.userId, userId),
				eq(transaction.bankAccountId, accountId),
				gt(transaction.date, since),
				notTransfer,
			),
		);
	return Math.max(0, -Number(row?.total ?? 0));
}

async function cardSummary(db: PostgresJsDatabase, userId: string, account: Account) {
	const latest = await latestStatement(db, userId, account.id);
	const rule = account.paymentRule as PaymentRule;
	const scheduled = latest
		? cardPayment({
				rule,
				statementBalance: latest.statementBalance,
				minimum: latest.minimumPayment ?? 0,
				periodSpend: latest.statementBalance,
				fixedPayment: account.fixedPayment,
			})
		: 0;
	return {
		statementCloseDay: account.statementCloseDay ?? dayOf(latest?.periodEnd),
		paymentDueDay: account.paymentDueDay ?? dayOf(latest?.dueDate),
		paymentRule: rule,
		fixedPayment: account.fixedPayment,
		latestStatement: latest,
		currentPeriodSpend: latest ? await spendSince(db, userId, account.id, latest.periodEnd) : 0,
		projectedInterest: latest
			? monthlyInterest(Math.max(0, latest.statementBalance - scheduled), account.aprBps)
			: 0,
		utilization: account.creditLimit ? account.currentBalance / account.creditLimit : null,
		overriddenFields: account.overriddenFields,
	};
}

export function loanTermsDto(row: typeof loanTerms.$inferSelect, account: Account): LoanTermsDto {
	return {
		principal: row.principal,
		termMonths: row.termMonths,
		firstPaymentDate: row.firstPaymentDate,
		paymentDay: row.paymentDay,
		scheduledPayment: row.scheduledPayment ?? computedPayment(row, account),
		extraPayment: row.extraPayment,
		source: row.source as LoanTermsDto["source"],
	};
}

function computedPayment(row: typeof loanTerms.$inferSelect, account: Account) {
	if (!row.termMonths) return null;
	return scheduledPayment(
		row.principal ?? account.currentBalance,
		account.aprBps ?? 0,
		row.termMonths,
	);
}

export function statementDto(row: typeof cardStatement.$inferSelect): CardStatementDto {
	return {
		id: row.id,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		statementBalance: row.statementBalance,
		minimumPayment: row.minimumPayment,
		dueDate: row.dueDate,
		// Narrowed on write: only "plaid" and "manual" are stored.
		source: row.source as CardStatementDto["source"],
	};
}

function dayOf(date: string | null | undefined) {
	return date ? Number(date.slice(8, 10)) : null;
}
