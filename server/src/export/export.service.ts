import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { category } from "../db/schema/category";
import { plaidItem } from "../db/schema/plaid-item";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import { type CsvCell, centsCell, textCell, toCsv } from "./csv";
import { DISPLAY_GROUP_LABELS, type TransactionExportRange } from "./export.types";

const TRANSACTION_HEADER = [
	"Date",
	"Name",
	"Merchant",
	"Amount",
	"Currency",
	"Category",
	"Account",
	"Pending",
	"Notes",
];
const ACCOUNT_HEADER = ["Name", "Institution", "Type", "Group", "Balance", "Currency", "Hidden"];

@Injectable()
export class ExportService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly fx: FxService,
	) {}

	async transactionsCsv(userId: string, range: TransactionExportRange) {
		const where: SQL[] = [eq(transaction.userId, userId)];
		if (range.dateFrom) where.push(gte(transaction.date, range.dateFrom));
		if (range.dateTo) where.push(lte(transaction.date, range.dateTo));
		const rows = await this.db
			.select({
				tx: transaction,
				categoryName: category.name,
				accountName: bankAccount.name,
			})
			.from(transaction)
			.leftJoin(category, eq(transaction.categoryId, category.id))
			.leftJoin(bankAccount, eq(transaction.bankAccountId, bankAccount.id))
			.where(and(...where))
			.orderBy(desc(transaction.date), desc(transaction.createdAt));
		const body: CsvCell[][] = rows.map(({ tx, categoryName, accountName }) => [
			tx.date,
			textCell(tx.name),
			textCell(tx.merchantName),
			centsCell(tx.amount),
			tx.isoCurrencyCode,
			textCell(categoryName),
			textCell(accountName),
			tx.pending,
			textCell(tx.notes),
		]);
		return toCsv([TRANSACTION_HEADER, ...body]);
	}

	async accountsCsv(userId: string) {
		const rows = await this.db
			.select({ account: bankAccount, institutionName: plaidItem.institutionName })
			.from(bankAccount)
			.leftJoin(plaidItem, eq(bankAccount.plaidItemId, plaidItem.id))
			.where(eq(bankAccount.userId, userId))
			.orderBy(asc(bankAccount.createdAt));
		const body: CsvCell[][] = rows.map(({ account, institutionName }) => [
			textCell(account.name),
			textCell(institutionName),
			account.type,
			DISPLAY_GROUP_LABELS[account.displayGroup] ?? account.displayGroup,
			centsCell(account.currentBalance),
			account.isoCurrencyCode,
			account.isHidden,
		]);
		const totals = await this.totals(
			userId,
			rows.map((row) => row.account),
		);
		return toCsv([ACCOUNT_HEADER, ...body, [], ...totals]);
	}

	/** Asset, liability, and net worth totals of visible accounts, in base currency. */
	private async totals(userId: string, accounts: (typeof bankAccount.$inferSelect)[]) {
		const base = await this.accounts.baseCurrency(userId);
		let assets = 0;
		let liabilities = 0;
		for (const account of accounts) {
			if (account.isHidden) continue;
			const converted = await this.fx.convert(
				account.currentBalance,
				account.isoCurrencyCode,
				base,
			);
			if (converted === null) continue;
			if (account.isAsset) assets += converted;
			else liabilities += converted;
		}
		const row = (label: string, cents: number): CsvCell[] => [
			label,
			"",
			"",
			"",
			centsCell(cents),
			base,
			"",
		];
		return [
			row("Total assets", assets),
			row("Total liabilities", liabilities),
			row("Net worth", assets - liabilities),
		];
	}
}
