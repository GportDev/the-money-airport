import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { forecastRow } from "../db/schema/forecast";
import { recurringItem } from "../db/schema/recurring-item";
import { transaction } from "../db/schema/transaction";
import type { FxService } from "../fx/fx.service";
import { monthEndOf } from "./dates";

/** Forecast row id → month → net Base cents of the RecurringItem's merchant. */
export type ActualsByRow = Map<string, Map<number, number>>;

/**
 * PRD F12.9: a row linked to a RecurringItem reads its Actuals from Transactions with that
 * merchant (and BankAccount, when the item has one), Transfers included, so a card payment counts.
 */
export async function recurringActuals(
	db: PostgresJsDatabase,
	fx: FxService,
	input: { userId: string; year: number; lastMonth: number; base: string },
): Promise<ActualsByRow> {
	const { userId, year, lastMonth, base } = input;
	const month = sql<number>`extract(month from ${transaction.date})::int`;
	const rows = await db
		.select({
			rowId: forecastRow.id,
			month,
			currency: transaction.isoCurrencyCode,
			amount: sql<string>`sum(${transaction.amount})`,
		})
		.from(forecastRow)
		.innerJoin(recurringItem, eq(recurringItem.id, forecastRow.recurringItemId))
		.innerJoin(
			transaction,
			and(
				eq(transaction.userId, userId),
				sql`lower(coalesce(${transaction.merchantName}, ${transaction.name})) = lower(${recurringItem.merchantName})`,
				sql`(${recurringItem.bankAccountId} is null or ${transaction.bankAccountId} = ${recurringItem.bankAccountId})`,
				gte(transaction.date, `${year}-01-01`),
				lte(transaction.date, monthEndOf(year, lastMonth)),
			),
		)
		.where(eq(forecastRow.userId, userId))
		.groupBy(forecastRow.id, month, transaction.isoCurrencyCode);

	const actuals: ActualsByRow = new Map();
	for (const row of rows) {
		const rate =
			(await fx.rateFor(row.currency, base, monthEndOf(year, row.month))) ??
			(await fx.rateFor(row.currency, base));
		if (rate === null) continue;
		const byMonth = actuals.get(row.rowId) ?? new Map<number, number>();
		byMonth.set(row.month, (byMonth.get(row.month) ?? 0) + Math.round(Number(row.amount) * rate));
		actuals.set(row.rowId, byMonth);
	}
	return actuals;
}
