import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { bankAccount } from "../db/schema/bank-account";
import { addDays } from "../forecast/dates";
import { OPEN_PERIOD_FALLBACK_DAYS } from "../liabilities/card-statements.service";
import { latestStatement, spendSince } from "../liabilities/liability-details";
import { dayInMonth, monthAfter } from "../liabilities/loan-terms.service";
import type { CreditCardDto } from "./card-benefits.types";

type Account = typeof bankAccount.$inferSelect;

/** The card's open billing period: where it starts, when it closes and is due, and its spend. */
export async function billingPeriod(
	db: PostgresJsDatabase,
	userId: string,
	account: Account,
	today: string,
): Promise<CreditCardDto["billingPeriod"]> {
	const latest = await latestStatement(db, userId, account.id);
	const periodStart = latest
		? addDays(latest.periodEnd, 1)
		: addDays(today, -OPEN_PERIOD_FALLBACK_DAYS);
	const closeDay = account.statementCloseDay ?? (latest ? dayOfMonth(latest.periodEnd) : null);
	return {
		periodStart,
		closesOn: closeDay ? nextDayOfMonth(today, closeDay) : null,
		dueOn: nextDueDate(latest?.dueDate ?? null, account.paymentDueDay, today),
		spend: await spendSince(db, userId, account.id, addDays(periodStart, -1)),
		latestStatement: latest,
	};
}

function nextDueDate(statementDueDate: string | null, paymentDueDay: number | null, today: string) {
	if (statementDueDate && statementDueDate >= today) return statementDueDate;
	return paymentDueDay ? nextDayOfMonth(today, paymentDueDay) : null;
}

/** The first date on or after `today` that falls on `day`, clamped to the month's length. */
export function nextDayOfMonth(today: string, day: number) {
	const thisMonth = dayInMonth(today.slice(0, 7), day);
	return thisMonth >= today ? thisMonth : dayInMonth(monthAfter(today), day);
}

function dayOfMonth(date: string) {
	return Number(date.slice(8, 10));
}
