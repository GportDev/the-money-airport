import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { bankAccount } from "../db/schema/bank-account";
import { cardBenefits } from "../db/schema/card-benefits";
import { plaidItem } from "../db/schema/plaid-item";

export type CreditAccountRow = Awaited<ReturnType<typeof creditAccounts>>[number];

/** The User's credit BankAccounts in name order, hidden ones included, each with its Card benefits. */
export function creditAccounts(db: PostgresJsDatabase, userId: string) {
	return db
		.select({
			account: bankAccount,
			institutionName: plaidItem.institutionName,
			institutionLogo: plaidItem.institutionLogo,
			benefits: cardBenefits,
		})
		.from(bankAccount)
		.leftJoin(plaidItem, eq(bankAccount.plaidItemId, plaidItem.id))
		.leftJoin(
			cardBenefits,
			and(eq(cardBenefits.bankAccountId, bankAccount.id), eq(cardBenefits.userId, userId)),
		)
		.where(and(eq(bankAccount.userId, userId), eq(bankAccount.displayGroup, "credit")))
		.orderBy(asc(bankAccount.name), asc(bankAccount.id));
}
