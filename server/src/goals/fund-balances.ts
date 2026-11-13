import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { goal, goalFundEntry } from "../db/schema/goal";
import type { FundSummary } from "./goals.types";

/**
 * Every Fund the User has, grouped by host BankAccount, with its native balance.
 * CONVENTION-DEVIATION: a plain query function, not a service, so AccountsService can show
 * Funds on hosts without GoalsModule and AccountsModule importing each other.
 */
export async function fundsByHost(db: PostgresJsDatabase, userId: string) {
	const rows = await db
		.select({
			goalId: goal.id,
			name: goal.name,
			hostId: goal.hostBankAccountId,
			balance: sql<string>`coalesce(sum(${goalFundEntry.amount}), 0)`,
		})
		.from(goal)
		.leftJoin(goalFundEntry, eq(goalFundEntry.goalId, goal.id))
		.where(and(eq(goal.userId, userId), eq(goal.funding, "fund")))
		.groupBy(goal.id)
		.orderBy(asc(goal.sortOrder), asc(goal.createdAt));

	const byHost = new Map<string, FundSummary[]>();
	for (const row of rows) {
		if (!row.hostId) {
			continue;
		}
		const list = byHost.get(row.hostId) ?? [];
		list.push({ goalId: row.goalId, name: row.name, balance: Number(row.balance) });
		byHost.set(row.hostId, list);
	}
	return byHost;
}

export function unassignedOf(hostBalance: number, funds: FundSummary[]) {
	return hostBalance - funds.reduce((sum, fund) => sum + fund.balance, 0);
}
