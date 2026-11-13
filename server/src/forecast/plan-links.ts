import { BadRequestException, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { bankAccount } from "../db/schema/bank-account";
import { category } from "../db/schema/category";
import { goal } from "../db/schema/goal";

/** BankAccounts a plan item can be paid from or received into. */
const PAYABLE_GROUPS = new Set(["cash", "credit"]);

export type PlanLinks = {
	categoryId?: string | null;
	bankAccountId?: string | null;
	goalId?: string | null;
};

/** Checks that every linked Category, BankAccount, and Fund belongs to the User and fits. */
export async function assertPlanLinks(db: PostgresJsDatabase, userId: string, links: PlanLinks) {
	if (links.categoryId) {
		const [found] = await db
			.select({ id: category.id })
			.from(category)
			.where(and(eq(category.id, links.categoryId), eq(category.userId, userId)))
			.limit(1);
		if (!found) throw new NotFoundException("Category not found");
	}
	if (links.bankAccountId) {
		const [found] = await db
			.select({ displayGroup: bankAccount.displayGroup })
			.from(bankAccount)
			.where(and(eq(bankAccount.id, links.bankAccountId), eq(bankAccount.userId, userId)))
			.limit(1);
		if (!found) throw new NotFoundException("BankAccount not found");
		if (!PAYABLE_GROUPS.has(found.displayGroup)) {
			throw new BadRequestException("Pay from a cash account or a credit card");
		}
	}
	if (links.goalId) {
		const [found] = await db
			.select({ funding: goal.funding })
			.from(goal)
			.where(and(eq(goal.id, links.goalId), eq(goal.userId, userId)))
			.limit(1);
		if (!found) throw new NotFoundException("Goal not found");
		if (found.funding !== "fund") throw new BadRequestException("Only a Fund can take deposits");
	}
}
