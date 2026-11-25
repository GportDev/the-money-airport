import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { transaction } from "../db/schema/transaction";
import type { MerchantDto } from "./transactions.types";

const MERCHANT_LIMIT = 500;

/** The merchants the User's Transactions already carry, most used first. */
@Injectable()
export class TransactionMerchantsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	async list(userId: string): Promise<MerchantDto[]> {
		const rows = await this.db
			.select({
				name: sql<string>`min(${transaction.merchantName})`,
				logoUrl: sql<string | null>`max(${transaction.merchantLogoUrl})`,
			})
			.from(transaction)
			.where(and(eq(transaction.userId, userId), isNotNull(transaction.merchantName)))
			.groupBy(sql`lower(${transaction.merchantName})`)
			.orderBy(desc(sql`count(*)`), sql`lower(min(${transaction.merchantName}))`)
			.limit(MERCHANT_LIMIT);
		return rows;
	}

	/** A logo another Transaction of this merchant already has, so a picked merchant shows it. */
	async logoFor(userId: string, merchantName: string) {
		const [row] = await this.db
			.select({ logoUrl: transaction.merchantLogoUrl })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					isNotNull(transaction.merchantLogoUrl),
					sql`lower(${transaction.merchantName}) = ${merchantName.toLowerCase()}`,
				),
			)
			.limit(1);
		return row?.logoUrl ?? null;
	}
}
