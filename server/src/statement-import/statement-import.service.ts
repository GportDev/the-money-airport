import {
	BadRequestException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, between, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { bankAccount } from "../db/schema/bank-account";
import { cardStatement } from "../db/schema/card-statement";
import { transaction } from "../db/schema/transaction";
import { addDays, todayIso } from "../forecast/dates";
import { statementDto } from "../liabilities/liability-details";
import { ownedAccountOfGroup } from "../liabilities/owned-account";
import { tagsAfterRecategorize } from "../transactions/category-tags";
import { TransactionRulesService } from "../transactions/transaction-rules.service";
import { TransactionsService } from "../transactions/transactions.service";
import { parseOfx } from "./ofx-parser";
import type {
	ParsedStatement,
	StatementImportInput,
	StatementImportPreview,
	StatementImportResult,
	StatementLine,
} from "./statement-import.types";
import { type HandEnteredRow, MATCH_WINDOW_DAYS, reconcile } from "./statement-matcher";

export const MAX_FILE_BYTES = 1024 * 1024;

type Db = PostgresJsDatabase;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Account = typeof bankAccount.$inferSelect;

/** Reads a closed Statement's OFX/QFX/QBO file and reconciles it with hand-entered rows. */
@Injectable()
export class StatementImportService {
	constructor(
		@Inject(DATABASE) private readonly db: Db,
		private readonly categories: CategoriesService,
		private readonly rules: TransactionRulesService,
		private readonly transactions: TransactionsService,
	) {}

	async preview(userId: string, accountId: string, file: string): Promise<StatementImportPreview> {
		const account = await this.manualCard(userId, accountId);
		const parsed = readFile(file);
		const { fresh, alreadyImported } = await this.splitImported(userId, accountId, parsed.lines);
		const rows = await this.handEnteredRows(userId, accountId, parsed);
		const result = reconcile(fresh, rows, parsed);
		const items = await this.transactions.itemsByIds(userId, [
			...result.matched.map((pair) => pair.row.id),
			...result.notOnStatement.map((row) => row.id),
		]);
		const itemById = new Map(items.map((item) => [item.id, item]));
		const { periodStart, periodEnd, statementBalance, minimumPayment, dueDate } = parsed;
		return {
			statement: { periodStart, periodEnd, statementBalance, minimumPayment, dueDate },
			isMaskMismatch: Boolean(
				account.mask && parsed.accountMask && account.mask !== parsed.accountMask,
			),
			matched: result.matched.flatMap(({ line, row }) => {
				const item = itemById.get(row.id);
				return item ? [{ line, transaction: item }] : [];
			}),
			newLines: result.newLines,
			notOnStatement: result.notOnStatement.flatMap((row) => itemById.get(row.id) ?? []),
			alreadyImported,
		};
	}

	async commit(
		userId: string,
		accountId: string,
		input: StatementImportInput,
	): Promise<StatementImportResult> {
		const account = await this.manualCard(userId, accountId);
		if (input.statement.periodStart > input.statement.periodEnd) {
			throw new BadRequestException("The period must start before it closes");
		}
		const parsed = { ...readFile(input.file), ...input.statement };
		const { fresh } = await this.splitImported(userId, accountId, parsed.lines);
		const rows = await this.handEnteredRows(userId, accountId, parsed);
		const result = reconcile(fresh, rows, parsed, new Set(input.unmatchedFitIds));
		const categoryFor = await this.categoryPicker(userId);

		return this.db.transaction(async (tx) => {
			for (const { line, row } of result.matched) {
				await confirmMatch(tx, userId, row.id, line);
			}
			const added = await insertLines(tx, userId, account, result.newLines, categoryFor);
			await flagNotOnStatement(
				tx,
				userId,
				result.notOnStatement.map((row) => row.id),
			);
			const statement = await upsertStatement(tx, userId, accountId, input.statement);
			await refreshBalance(tx, userId, accountId, input.statement);
			return {
				added,
				confirmed: result.matched.length,
				notOnStatement: result.notOnStatement.length,
				statement: statementDto(statement),
			};
		});
	}

	/** Keep: the User says a Not on statement row is real; it stays and loses the badge. */
	async keep(userId: string, transactionId: string) {
		const [row] = await this.db
			.update(transaction)
			.set({ notOnStatement: false, updatedAt: new Date() })
			.where(and(eq(transaction.userId, userId), eq(transaction.id, transactionId)))
			.returning({ id: transaction.id });
		if (!row) throw new NotFoundException("Transaction not found");
		return { success: true };
	}

	private async manualCard(userId: string, accountId: string) {
		const account = await ownedAccountOfGroup(this.db, userId, accountId, "credit");
		if (account.source !== "manual") {
			throw new ForbiddenException("Statement import is for manual cards only");
		}
		return account;
	}

	/** Lines whose FITID this account already stores are skipped, so re-imports add nothing. */
	private async splitImported(userId: string, accountId: string, lines: StatementLine[]) {
		const stored = await this.db
			.select({ externalId: transaction.externalId })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.bankAccountId, accountId),
					inArray(
						transaction.externalId,
						lines.map((line) => line.fitId),
					),
				),
			);
		const storedIds = new Set(stored.map((row) => row.externalId));
		return {
			fresh: lines.filter((line) => !storedIds.has(line.fitId)),
			alreadyImported: lines.filter((line) => storedIds.has(line.fitId)),
		};
	}

	/** Unconfirmed hand-entered rows near the period, each split counted at its full amount. */
	private async handEnteredRows(
		userId: string,
		accountId: string,
		period: { periodStart: string; periodEnd: string },
	): Promise<HandEnteredRow[]> {
		const parts = sql<number>`(${transaction.amount} + coalesce((select sum(part.amount) from ${transaction} as part where part.split_parent_id = ${transaction.id}), 0))::int`;
		return this.db
			.select({
				id: transaction.id,
				date: transaction.date,
				amount: parts,
				name: transaction.name,
				merchantName: transaction.merchantName,
				notOnStatement: transaction.notOnStatement,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.bankAccountId, accountId),
					eq(transaction.isManual, true),
					isNull(transaction.splitParentId),
					isNull(transaction.externalId),
					between(
						transaction.date,
						addDays(period.periodStart, -MATCH_WINDOW_DAYS),
						addDays(period.periodEnd, MATCH_WINDOW_DAYS),
					),
				),
			);
	}

	/** New lines get the User's Transaction rules first, like Plaid rows, else Uncategorized. */
	private async categoryPicker(userId: string) {
		const lookup = await this.categories.lookup(userId);
		const ruleFor = await this.rules.matcher(userId);
		return (line: StatementLine) => {
			const categoryId =
				ruleFor({ name: line.name, merchantName: null, amount: line.amount }) ??
				lookup.uncategorized.id;
			return { categoryId, tags: tagsAfterRecategorize(lookup, categoryId, categoryId, []) };
		};
	}
}

function readFile(file: string): ParsedStatement {
	if (Buffer.byteLength(file, "utf8") > MAX_FILE_BYTES) {
		throw new BadRequestException("The file is over 1 MB");
	}
	return parseOfx(file);
}

/**
 * The bank's amount and date replace the User's; labels, notes, and splits stay. A split
 * parent keeps the first part, so it takes the bank's amount less its other parts.
 */
async function confirmMatch(tx: Tx, userId: string, rowId: string, line: StatementLine) {
	const now = new Date();
	await tx
		.update(transaction)
		.set({
			date: line.date,
			amount: sql`${line.amount} - coalesce((select sum(part.amount) from ${transaction} as part where part.split_parent_id = ${rowId}), 0)`,
			externalId: line.fitId,
			statementConfirmed: true,
			notOnStatement: null,
			updatedAt: now,
		})
		.where(and(eq(transaction.userId, userId), eq(transaction.id, rowId)));
	await tx
		.update(transaction)
		.set({ date: line.date, updatedAt: now })
		.where(and(eq(transaction.userId, userId), eq(transaction.splitParentId, rowId)));
}

async function insertLines(
	tx: Tx,
	userId: string,
	account: Account,
	lines: StatementLine[],
	categoryFor: (line: StatementLine) => { categoryId: string; tags: string[] },
) {
	if (lines.length === 0) return 0;
	const inserted = await tx
		.insert(transaction)
		.values(
			lines.map((line) => ({
				userId,
				bankAccountId: account.id,
				name: line.name,
				amount: line.amount,
				isoCurrencyCode: account.isoCurrencyCode,
				date: line.date,
				externalId: line.fitId,
				statementConfirmed: true,
				...categoryFor(line),
			})),
		)
		.onConflictDoNothing({
			target: [transaction.userId, transaction.bankAccountId, transaction.externalId],
		})
		.returning({ id: transaction.id });
	return inserted.length;
}

async function flagNotOnStatement(tx: Tx, userId: string, ids: string[]) {
	if (ids.length === 0) return;
	await tx
		.update(transaction)
		.set({ notOnStatement: true, updatedAt: new Date() })
		.where(and(eq(transaction.userId, userId), inArray(transaction.id, ids)));
}

async function upsertStatement(
	tx: Tx,
	userId: string,
	accountId: string,
	input: StatementImportInput["statement"],
) {
	const values = {
		periodStart: input.periodStart,
		statementBalance: input.statementBalance,
		minimumPayment: input.minimumPayment,
		dueDate: input.dueDate,
		source: "import",
		updatedAt: new Date(),
	};
	const [row] = await tx
		.insert(cardStatement)
		.values({ ...values, userId, bankAccountId: accountId, periodEnd: input.periodEnd })
		.onConflictDoUpdate({
			target: [cardStatement.bankAccountId, cardStatement.periodEnd],
			set: values,
		})
		.returning();
	if (!row) throw new BadRequestException("Could not save the statement");
	return row;
}

/**
 * The newest Statement sets the card's balance: what was owed at the close plus every
 * Transaction after it, so charges entered since the close still count.
 */
async function refreshBalance(
	tx: Tx,
	userId: string,
	accountId: string,
	statement: { periodEnd: string; statementBalance: number },
) {
	const [newer] = await tx
		.select({ id: cardStatement.id })
		.from(cardStatement)
		.where(
			and(
				eq(cardStatement.userId, userId),
				eq(cardStatement.bankAccountId, accountId),
				gt(cardStatement.periodEnd, statement.periodEnd),
			),
		)
		.limit(1);
	if (newer) return;
	const [since] = await tx
		.select({ total: sql<string>`coalesce(sum(${transaction.amount}), 0)` })
		.from(transaction)
		.where(
			and(
				eq(transaction.userId, userId),
				eq(transaction.bankAccountId, accountId),
				gt(transaction.date, statement.periodEnd),
			),
		);
	const balance = statement.statementBalance - Number(since?.total ?? 0);
	await tx
		.update(bankAccount)
		.set({ currentBalance: balance, updatedAt: new Date() })
		.where(and(eq(bankAccount.userId, userId), eq(bankAccount.id, accountId)));
	await tx
		.insert(accountBalanceSnapshot)
		.values({ userId, bankAccountId: accountId, date: todayIso(), balance })
		.onConflictDoUpdate({
			target: [accountBalanceSnapshot.bankAccountId, accountBalanceSnapshot.date],
			set: { balance, isEstimated: false },
		});
}
