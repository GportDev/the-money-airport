import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { bankAccount } from "../db/schema/bank-account";
import { forecastRow } from "../db/schema/forecast";
import { recurringItem } from "../db/schema/recurring-item";
import { transaction } from "../db/schema/transaction";

const LIABILITY_GROUPS = ["credit", "loan"];
/** Same window transfer pairing uses on sync. */
const PAIR_DAYS = 3;

/**
 * PRD F12.25: forecast rows linked to a RecurringItem whose matching outflows are Transfers
 * into a card or loan. The Debt plan already projects those payments, so counting the row too
 * would take the money twice.
 */
export async function countedInDebtRowIds(db: PostgresJsDatabase, userId: string) {
	const payment = alias(transaction, "payment");
	const receipt = alias(transaction, "receipt");
	const rows = await db
		.selectDistinct({ id: forecastRow.id })
		.from(forecastRow)
		.innerJoin(recurringItem, eq(recurringItem.id, forecastRow.recurringItemId))
		.innerJoin(
			payment,
			and(
				eq(payment.userId, userId),
				lt(payment.amount, 0),
				sql`'transfer' = any(${payment.tags})`,
				sql`lower(coalesce(${payment.merchantName}, ${payment.name})) = lower(${recurringItem.merchantName})`,
				sql`(${recurringItem.bankAccountId} is null or ${payment.bankAccountId} = ${recurringItem.bankAccountId})`,
			),
		)
		.innerJoin(
			receipt,
			and(
				eq(receipt.userId, userId),
				sql`${receipt.amount} = -${payment.amount}`,
				sql`'transfer' = any(${receipt.tags})`,
				sql`abs(${receipt.date} - ${payment.date}) <= ${PAIR_DAYS}`,
			),
		)
		.innerJoin(
			bankAccount,
			and(
				eq(bankAccount.id, receipt.bankAccountId),
				inArray(bankAccount.displayGroup, LIABILITY_GROUPS),
			),
		)
		.where(eq(forecastRow.userId, userId));
	return new Set(rows.map((row) => row.id));
}
