import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { cardStatement } from "../db/schema/card-statement";
import { transaction } from "../db/schema/transaction";
import { addDays, todayIso } from "../forecast/dates";
import { TransactionsService } from "../transactions/transactions.service";
import type { CardStatementDto, ManualStatementInput, StatementPeriod } from "./liabilities.types";
import { notTransfer, statementDto } from "./liability-details";
import { ownedAccountOfGroup } from "./owned-account";

/** The open period with no Statement yet looks back this far. */
const OPEN_PERIOD_FALLBACK_DAYS = 30;
const PERIOD_TRANSACTION_LIMIT = 200;
export const OPEN_PERIOD = "open";

@Injectable()
export class CardStatementsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly transactions: TransactionsService,
	) {}

	/** A Statement period: `periodEnd` picks one, "open" the current one, none the latest. */
	async period(userId: string, accountId: string, periodEnd?: string): Promise<StatementPeriod> {
		await ownedAccountOfGroup(this.db, userId, accountId, "credit");
		const statements = await this.statements(userId, accountId);
		const latest = statements.at(-1) ?? null;
		const isOpen = periodEnd === OPEN_PERIOD || (!periodEnd && !latest);
		if (isOpen) {
			const start = latest
				? addDays(latest.periodEnd, 1)
				: addDays(todayIso(), -OPEN_PERIOD_FALLBACK_DAYS);
			return this.build(
				userId,
				accountId,
				null,
				start,
				todayIso(),
				latest?.periodEnd ?? null,
				null,
			);
		}
		const index = periodEnd
			? statements.findIndex((row) => row.periodEnd === periodEnd)
			: statements.length - 1;
		const statement = statements[index];
		if (!statement) throw new NotFoundException("Statement not found");
		return this.build(
			userId,
			accountId,
			statement,
			statement.periodStart,
			statement.periodEnd,
			statements[index - 1]?.periodEnd ?? null,
			statements[index + 1]?.periodEnd ?? OPEN_PERIOD,
		);
	}

	async create(userId: string, accountId: string, input: ManualStatementInput) {
		await ownedAccountOfGroup(this.db, userId, accountId, "credit");
		if (input.periodStart > input.periodEnd) {
			throw new BadRequestException("The period must start before it closes");
		}
		const values = {
			periodStart: input.periodStart,
			statementBalance: input.statementBalance,
			minimumPayment: input.minimumPayment ?? null,
			dueDate: input.dueDate ?? null,
			source: "manual",
			updatedAt: new Date(),
		};
		const [row] = await this.db
			.insert(cardStatement)
			.values({ ...values, userId, bankAccountId: accountId, periodEnd: input.periodEnd })
			.onConflictDoUpdate({
				target: [cardStatement.bankAccountId, cardStatement.periodEnd],
				set: values,
			})
			.returning();
		if (!row) throw new NotFoundException();
		return statementDto(row);
	}

	private async statements(userId: string, accountId: string) {
		const rows = await this.db
			.select()
			.from(cardStatement)
			.where(and(eq(cardStatement.userId, userId), eq(cardStatement.bankAccountId, accountId)))
			.orderBy(asc(cardStatement.periodEnd));
		return rows.map(statementDto);
	}

	private async build(
		userId: string,
		accountId: string,
		statement: CardStatementDto | null,
		periodStart: string,
		periodEnd: string,
		previousPeriodEnd: string | null,
		nextPeriodEnd: string | null,
	): Promise<StatementPeriod> {
		const [sum] = await this.db
			.select({ total: sql<string>`coalesce(sum(${transaction.amount}), 0)` })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.bankAccountId, accountId),
					sql`${transaction.date} between ${periodStart} and ${periodEnd}`,
					notTransfer,
				),
			);
		const page = await this.transactions.list(userId, {
			limit: PERIOD_TRANSACTION_LIMIT,
			dateFrom: periodStart,
			dateTo: periodEnd,
			accountIds: [accountId],
			categoryIds: [],
			sortDir: "desc",
		});
		return {
			statement,
			periodStart,
			periodEnd,
			total: Number(sum?.total ?? 0),
			previousPeriodEnd,
			nextPeriodEnd,
			transactions: page.data,
		};
	}
}
