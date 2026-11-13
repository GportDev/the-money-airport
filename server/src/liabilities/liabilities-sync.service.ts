import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { cardStatement } from "../db/schema/card-statement";
import { loanTerms } from "../db/schema/loan-terms";
import { addMonths } from "../debt/months";
import { addDays } from "../forecast/dates";
import type { PlaidCardLiability, PlaidLiabilities, PlaidLoanLiability } from "../plaid/plaid.port";
import type { CardTermField } from "./liabilities.types";

type Account = typeof bankAccount.$inferSelect;

/** Writes Plaid Liabilities onto BankAccounts; fields the User overrode, and manual terms, stay. */
@Injectable()
export class LiabilitiesSyncService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	async apply(userId: string, liabilities: PlaidLiabilities) {
		for (const card of liabilities.cards) {
			const account = await this.accountFor(userId, card.plaidAccountId);
			if (account) await this.applyCard(userId, account, card);
		}
		for (const loan of liabilities.loans) {
			const account = await this.accountFor(userId, loan.plaidAccountId);
			if (account) await this.applyLoan(userId, account, loan);
		}
	}

	private async applyCard(userId: string, account: Account, card: PlaidCardLiability) {
		await this.updateTerms(account, {
			aprBps: card.aprBps,
			statementCloseDay: dayOf(card.lastStatementIssueDate),
			paymentDueDay: dayOf(card.nextPaymentDueDate),
		});
		if (!card.lastStatementIssueDate || card.lastStatementBalance === null) return;
		const periodEnd = card.lastStatementIssueDate;
		const values = {
			periodStart: await this.periodStart(account.id, periodEnd),
			statementBalance: card.lastStatementBalance,
			minimumPayment: card.minimumPayment,
			dueDate: card.nextPaymentDueDate,
			source: "plaid",
			updatedAt: new Date(),
		};
		await this.db
			.insert(cardStatement)
			.values({ ...values, userId, bankAccountId: account.id, periodEnd })
			.onConflictDoUpdate({
				target: [cardStatement.bankAccountId, cardStatement.periodEnd],
				set: values,
				setWhere: eq(cardStatement.source, "plaid"),
			});
	}

	private async applyLoan(userId: string, account: Account, loan: PlaidLoanLiability) {
		await this.updateTerms(account, { aprBps: loan.aprBps });
		const values = {
			principal: loan.principal,
			termMonths: loan.termMonths,
			firstPaymentDate: loan.firstPaymentDate,
			paymentDay: dayOf(loan.nextPaymentDueDate),
			scheduledPayment: loan.scheduledPayment,
			source: "plaid",
			updatedAt: new Date(),
		};
		await this.db
			.insert(loanTerms)
			.values({ ...values, userId, bankAccountId: account.id })
			.onConflictDoUpdate({
				target: loanTerms.bankAccountId,
				set: values,
				setWhere: eq(loanTerms.source, "plaid"),
			});
	}

	/** Sets each known field the User has not overridden. */
	private async updateTerms(
		account: Account,
		fields: Partial<Record<CardTermField, number | null>>,
	) {
		const set = Object.fromEntries(
			Object.entries(fields).filter(
				([field, value]) => value !== null && !account.overriddenFields.includes(field),
			),
		);
		if (Object.keys(set).length === 0) return;
		await this.db
			.update(bankAccount)
			.set({ ...set, updatedAt: new Date() })
			.where(eq(bankAccount.id, account.id));
	}

	/** The day after the previous close, or one month back when this is the first Statement. */
	private async periodStart(accountId: string, periodEnd: string) {
		const [previous] = await this.db
			.select({ periodEnd: cardStatement.periodEnd })
			.from(cardStatement)
			.where(
				and(eq(cardStatement.bankAccountId, accountId), lt(cardStatement.periodEnd, periodEnd)),
			)
			.orderBy(desc(cardStatement.periodEnd))
			.limit(1);
		return previous ? addDays(previous.periodEnd, 1) : addDays(addMonths(periodEnd, -1), 1);
	}

	private async accountFor(userId: string, plaidAccountId: string) {
		const [row] = await this.db
			.select()
			.from(bankAccount)
			.where(and(eq(bankAccount.userId, userId), eq(bankAccount.plaidAccountId, plaidAccountId)))
			.limit(1);
		return row ?? null;
	}
}

function dayOf(date: string | null) {
	return date ? Number(date.slice(8, 10)) : null;
}
