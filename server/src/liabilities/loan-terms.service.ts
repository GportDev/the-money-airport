import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { loanTerms } from "../db/schema/loan-terms";
import { type Amortization, amortization } from "../debt/amortization";
import { addMonths } from "../debt/months";
import { lastDayOf, pad, todayIso } from "../forecast/dates";
import type { LoanTermsDto, LoanTermsInput } from "./liabilities.types";
import { loanTermsDto } from "./liability-details";
import { ownedAccountOfGroup } from "./owned-account";

@Injectable()
export class LoanTermsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/** Merges the given fields into the loan's terms; a User edit makes them manual. */
	async upsert(userId: string, accountId: string, input: LoanTermsInput): Promise<LoanTermsDto> {
		const account = await ownedAccountOfGroup(this.db, userId, accountId, "loan");
		const values = { ...input, source: "manual", updatedAt: new Date() };
		const [row] = await this.db
			.insert(loanTerms)
			.values({ ...values, userId, bankAccountId: accountId })
			.onConflictDoUpdate({ target: loanTerms.bankAccountId, set: values })
			.returning();
		if (!row) throw new NotFoundException();
		return loanTermsDto(row, account);
	}

	/** The payoff picture from today's balance; `extra` defaults to the stored extra payment. */
	async amortization(userId: string, accountId: string, extra?: number): Promise<Amortization> {
		const account = await ownedAccountOfGroup(this.db, userId, accountId, "loan");
		const [row] = await this.db
			.select()
			.from(loanTerms)
			.where(and(eq(loanTerms.userId, userId), eq(loanTerms.bankAccountId, accountId)))
			.limit(1);
		const terms = row ? loanTermsDto(row, account) : null;
		if (!terms?.scheduledPayment || account.currentBalance <= 0) {
			throw new BadRequestException("Add APR and term, or a scheduled payment, to see a payoff");
		}
		return amortization({
			balance: account.currentBalance,
			aprBps: account.aprBps,
			payment: terms.scheduledPayment,
			extra: extra ?? terms.extraPayment,
			firstDate: nextPaymentDate(terms),
		});
	}
}

/** The first payment after today: the stored first payment date, else the next payment day. */
export function nextPaymentDate(terms: Pick<LoanTermsDto, "firstPaymentDate" | "paymentDay">) {
	const today = todayIso();
	if (terms.firstPaymentDate && terms.firstPaymentDate > today) return terms.firstPaymentDate;
	const day = terms.paymentDay ?? Number((terms.firstPaymentDate ?? today).slice(8, 10));
	const thisMonth = dayInMonth(today.slice(0, 7), day);
	return thisMonth > today ? thisMonth : dayInMonth(monthAfter(today), day);
}

function dayInMonth(month: string, day: number) {
	return `${month}-${pad(Math.min(day, lastDayOf(month)))}`;
}

function monthAfter(date: string) {
	return addMonths(`${date.slice(0, 7)}-01`, 1).slice(0, 7);
}
