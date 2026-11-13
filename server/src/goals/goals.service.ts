import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { goal, goalAccount } from "../db/schema/goal";
import { transaction } from "../db/schema/transaction";
import { DebtPlanService } from "../forecast/debt-plan.service";
import { FxService } from "../fx/fx.service";
import { fundsByHost, unassignedOf } from "./fund-balances";
import { goalStatus, percentComplete, remainingFor } from "./goal-progress";
import type {
	CreateGoalInput,
	FundHostDto,
	GoalAccountDto,
	GoalDto,
	GoalFunding,
	GoalsList,
	GoalType,
	UpdateGoalInput,
} from "./goals.types";

type GoalRow = typeof goal.$inferSelect;
type AccountRow = typeof bankAccount.$inferSelect;

const CAPACITY_MONTHS = 3;
const notTransfer = sql`not (${transaction.tags} && array['transfer','savings_transfer']::text[])`;

@Injectable()
export class GoalsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly fx: FxService,
		private readonly debtPlan: DebtPlanService,
	) {}

	async list(userId: string, type?: GoalType): Promise<GoalsList> {
		const [goals, base, accountRows, associations, funds] = await Promise.all([
			this.db
				.select()
				.from(goal)
				.where(and(eq(goal.userId, userId), type ? eq(goal.type, type) : undefined))
				.orderBy(asc(goal.sortOrder), asc(goal.createdAt)),
			this.accounts.baseCurrency(userId),
			this.db.select().from(bankAccount).where(eq(bankAccount.userId, userId)),
			this.db.select().from(goalAccount).where(eq(goalAccount.userId, userId)),
			fundsByHost(this.db, userId),
		]);
		const accountById = new Map(accountRows.map((row) => [row.id, row]));
		const accountsByGoal = new Map<string, AccountRow[]>();
		for (const link of associations) {
			const account = accountById.get(link.bankAccountId);
			if (!account || account.isHidden) {
				continue;
			}
			accountsByGoal.set(link.goalId, [...(accountsByGoal.get(link.goalId) ?? []), account]);
		}
		const hosts = toHosts(funds, accountById);
		const capacity = goals.some((row) => row.targetDate)
			? await this.monthlyCapacity(userId, base)
			: 0;

		const dtos: GoalDto[] = [];
		for (const row of goals) {
			dtos.push(await this.toDto(row, base, accountsByGoal.get(row.id) ?? [], hosts, capacity));
		}
		return {
			totalCurrent: dtos.reduce((sum, row) => sum + row.currentAmount, 0),
			baseCurrency: base,
			goals: await this.withPayoffMonths(userId, dtos),
			hosts,
		};
	}

	/** Pay-down Goals read their liability's payoff month from the Debt plan (PRD F10.10). */
	private async withPayoffMonths(userId: string, dtos: GoalDto[]) {
		const hasLiability = dtos.some((dto) => dto.type === "pay_down" && dto.accounts.length > 0);
		if (!hasLiability) return dtos;
		const payoffs = await this.debtPlan.payoffMonths(userId);
		return dtos.map((dto) => {
			const liability = dto.type === "pay_down" ? dto.accounts[0] : undefined;
			return liability ? { ...dto, payoffMonth: payoffs.get(liability.id) ?? null } : dto;
		});
	}

	async create(userId: string, input: CreateGoalInput) {
		const funding: GoalFunding = input.funding ?? "accounts";
		if (funding === "fund") {
			await this.assertCanHost(userId, input.hostBankAccountId);
		}
		const [row] = await this.db
			.insert(goal)
			.values({
				userId,
				name: input.name,
				type: input.type,
				funding,
				hostBankAccountId: funding === "fund" ? input.hostBankAccountId : null,
				targetAmount: input.targetAmount,
				targetDate: input.targetDate ?? null,
				...(input.icon ? { icon: input.icon } : {}),
				...(input.color ? { color: input.color } : {}),
			})
			.returning({ id: goal.id });
		if (!row) {
			throw new Error("Could not create goal");
		}
		return this.get(userId, row.id);
	}

	async update(userId: string, id: string, input: UpdateGoalInput) {
		const [row] = await this.db
			.update(goal)
			.set({ ...input, updatedAt: new Date() })
			.where(and(eq(goal.id, id), eq(goal.userId, userId)))
			.returning({ id: goal.id });
		if (!row) {
			throw new NotFoundException("Goal not found");
		}
		return this.get(userId, row.id);
	}

	async remove(userId: string, id: string) {
		const [row] = await this.db
			.delete(goal)
			.where(and(eq(goal.id, id), eq(goal.userId, userId)))
			.returning({ id: goal.id });
		if (!row) {
			throw new NotFoundException("Goal not found");
		}
		return { success: true };
	}

	/** Replaces the Goal's BankAccounts. An account on another Goal moves here. */
	async setAccounts(userId: string, id: string, bankAccountIds: string[]) {
		const target = await this.owned(userId, id);
		if (target.funding !== "accounts") {
			throw new BadRequestException("A Fund lives in its host BankAccount");
		}
		const ids = [...new Set(bankAccountIds)];
		const rows =
			ids.length === 0
				? []
				: await this.db
						.select()
						.from(bankAccount)
						.where(and(eq(bankAccount.userId, userId), inArray(bankAccount.id, ids)));
		if (rows.length !== ids.length) {
			throw new NotFoundException("BankAccount not found");
		}
		await this.assertAssociable(userId, target.type as GoalType, rows);

		await this.db.transaction(async (tx) => {
			await tx.delete(goalAccount).where(eq(goalAccount.goalId, id));
			if (ids.length === 0) {
				return;
			}
			await tx
				.delete(goalAccount)
				.where(and(eq(goalAccount.userId, userId), inArray(goalAccount.bankAccountId, ids)));
			await tx
				.insert(goalAccount)
				.values(ids.map((bankAccountId) => ({ userId, goalId: id, bankAccountId })));
		});
		return this.get(userId, id);
	}

	async owned(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(goal)
			.where(and(eq(goal.id, id), eq(goal.userId, userId)))
			.limit(1);
		if (!row) {
			throw new NotFoundException("Goal not found");
		}
		return row;
	}

	private async get(userId: string, id: string) {
		const found = (await this.list(userId)).goals.find((row) => row.id === id);
		if (!found) {
			throw new NotFoundException("Goal not found");
		}
		return found;
	}

	private async assertAssociable(userId: string, type: GoalType, rows: AccountRow[]) {
		if (rows.some((row) => row.isHidden)) {
			throw new BadRequestException("Hidden BankAccounts cannot join a Goal");
		}
		if (type === "save_up" && rows.some((row) => !row.isAsset)) {
			throw new BadRequestException("Save-up Goals take asset BankAccounts only");
		}
		if (type === "pay_down" && (rows.length > 1 || rows.some((row) => row.isAsset))) {
			throw new BadRequestException("Pay-down Goals take at most one liability");
		}
		if (rows.length === 0) {
			return;
		}
		const [host] = await this.db
			.select({ id: goal.id })
			.from(goal)
			.where(
				and(
					eq(goal.userId, userId),
					inArray(
						goal.hostBankAccountId,
						rows.map((row) => row.id),
					),
				),
			)
			.limit(1);
		if (host) {
			throw new BadRequestException("A BankAccount that hosts Funds cannot join a Goal");
		}
	}

	private async assertCanHost(userId: string, hostId: string | undefined) {
		if (!hostId) {
			throw new BadRequestException("A Fund needs a host BankAccount");
		}
		const [host] = await this.db
			.select()
			.from(bankAccount)
			.where(and(eq(bankAccount.id, hostId), eq(bankAccount.userId, userId)))
			.limit(1);
		if (!host) {
			throw new NotFoundException("BankAccount not found");
		}
		if (host.isHidden || !host.isAsset) {
			throw new BadRequestException("A Fund host must be a visible asset BankAccount");
		}
		const [associated] = await this.db
			.select({ id: goalAccount.id })
			.from(goalAccount)
			.where(eq(goalAccount.bankAccountId, hostId))
			.limit(1);
		if (associated) {
			throw new BadRequestException("That BankAccount already belongs to a Goal");
		}
	}

	private async toDto(
		row: GoalRow,
		base: string,
		accounts: AccountRow[],
		hosts: FundHostDto[],
		capacity: number,
	): Promise<GoalDto> {
		const type = row.type as GoalType;
		const host = hosts.find((item) => item.id === row.hostBankAccountId) ?? null;
		const fundBalance =
			row.funding === "fund"
				? (host?.funds.find((fund) => fund.goalId === row.id)?.balance ?? 0)
				: null;
		const currentAmount =
			fundBalance === null
				? await this.sumInBase(accounts, base)
				: ((await this.fx.convert(fundBalance, host?.isoCurrencyCode ?? base, base)) ?? 0);
		const hasSource = row.funding === "fund" || accounts.length > 0;
		return {
			id: row.id,
			name: row.name,
			type,
			funding: row.funding as GoalFunding,
			icon: row.icon,
			color: row.color,
			thumbnailUrl: row.thumbnailUrl,
			targetAmount: row.targetAmount,
			currentAmount,
			targetDate: row.targetDate,
			sortOrder: row.sortOrder,
			status: goalStatus({
				remaining: remainingFor(type, row.targetAmount, currentAmount),
				targetDate: row.targetDate,
				today: new Date().toISOString().slice(0, 10),
				monthlyCapacity: capacity,
			}),
			percentComplete: percentComplete(type, row.targetAmount, currentAmount, hasSource),
			accounts: accounts.map(toAccountDto),
			host: host
				? {
						id: host.id,
						name: host.name,
						isoCurrencyCode: host.isoCurrencyCode,
						unassigned: host.unassigned,
					}
				: null,
			fundBalance,
			payoffMonth: null,
		};
	}

	private async sumInBase(accounts: AccountRow[], base: string) {
		let total = 0;
		for (const account of accounts) {
			total += (await this.fx.convert(account.currentBalance, account.isoCurrencyCode, base)) ?? 0;
		}
		return total;
	}

	/** Average monthly net cash flow (income − expenses, Transfers excluded) over full months. */
	private async monthlyCapacity(userId: string, base: string) {
		const now = new Date();
		const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - CAPACITY_MONTHS, 1));
		const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
		const rows = await this.db
			.select({
				currency: transaction.isoCurrencyCode,
				net: sql<string>`sum(${transaction.amount})`,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, from.toISOString().slice(0, 10)),
					lte(transaction.date, to.toISOString().slice(0, 10)),
					notTransfer,
				),
			)
			.groupBy(transaction.isoCurrencyCode);
		let net = 0;
		for (const row of rows) {
			net += (await this.fx.convert(Number(row.net), row.currency, base)) ?? 0;
		}
		return net / CAPACITY_MONTHS;
	}
}

function toAccountDto(row: AccountRow): GoalAccountDto {
	return {
		id: row.id,
		name: row.name,
		mask: row.mask,
		currentBalance: row.currentBalance,
		isoCurrencyCode: row.isoCurrencyCode,
	};
}

function toHosts(
	funds: Awaited<ReturnType<typeof fundsByHost>>,
	accountById: Map<string, AccountRow>,
): FundHostDto[] {
	const hosts: FundHostDto[] = [];
	for (const [hostId, list] of funds) {
		const account = accountById.get(hostId);
		if (!account) {
			continue;
		}
		hosts.push({
			id: account.id,
			name: account.name,
			isoCurrencyCode: account.isoCurrencyCode,
			balance: account.currentBalance,
			unassigned: unassignedOf(account.currentBalance, list),
			funds: list,
		});
	}
	return hosts;
}
