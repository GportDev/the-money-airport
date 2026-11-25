import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull, type SQL, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { category } from "../db/schema/category";
import { transaction } from "../db/schema/transaction";
import { transactionRule } from "../db/schema/transaction-rule";
import { tagsAfterRecategorizeSql } from "./category-tags";
import type { TransactionRuleDto } from "./transactions.types";

type RuleInput = { merchant: string; amount: number | null; categoryId: string };
type Matchable = { merchantName: string | null; name: string; amount: number };

const merchantKey = sql`lower(coalesce(${transaction.merchantName}, ${transaction.name}))`;

function keyOf(row: Matchable) {
	return (row.merchantName ?? row.name).trim().toLowerCase();
}

/** Rules put every Transaction with a merchant (and, optionally, an exact amount) in a Category. */
@Injectable()
export class TransactionRulesService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly categories: CategoriesService,
	) {}

	async list(userId: string): Promise<TransactionRuleDto[]> {
		const rows = await this.db
			.select({
				rule: transactionRule,
				category: {
					id: category.id,
					name: category.name,
					icon: category.icon,
					color: category.color,
				},
			})
			.from(transactionRule)
			.innerJoin(category, eq(transactionRule.categoryId, category.id))
			.where(eq(transactionRule.userId, userId))
			.orderBy(asc(sql`lower(${transactionRule.merchant})`), asc(transactionRule.amount));
		return rows.map((row) => ({
			id: row.rule.id,
			merchant: row.rule.merchant,
			amount: row.rule.amount,
			category: row.category,
		}));
	}

	/** Saves the rule (replacing one with the same merchant and amount) and applies it now. */
	async save(userId: string, input: RuleInput) {
		const lookup = await this.categories.lookup(userId);
		if (!lookup.byId.has(input.categoryId)) {
			throw new BadRequestException("Category not found");
		}
		const merchant = input.merchant.trim();
		const [existing] = await this.db
			.select({ id: transactionRule.id })
			.from(transactionRule)
			.where(
				and(
					eq(transactionRule.userId, userId),
					sql`lower(${transactionRule.merchant}) = ${merchant.toLowerCase()}`,
					sql`${transactionRule.amount} is not distinct from ${input.amount}::int`,
				),
			)
			.limit(1);
		const applied = await this.db.transaction(async (tx) => {
			if (existing) {
				await tx
					.update(transactionRule)
					.set({ categoryId: input.categoryId })
					.where(eq(transactionRule.id, existing.id));
			} else {
				await tx
					.insert(transactionRule)
					.values({ userId, merchant, amount: input.amount, categoryId: input.categoryId });
			}
			const updated = await tx
				.update(transaction)
				.set({
					categoryId: input.categoryId,
					tags: tagsAfterRecategorizeSql(lookup, input.categoryId),
					updatedAt: new Date(),
				})
				.where(and(...matching(userId, merchant, input.amount)))
				.returning({ id: transaction.id });
			return updated.length;
		});
		return { applied };
	}

	async remove(userId: string, id: string) {
		const [row] = await this.db
			.delete(transactionRule)
			.where(and(eq(transactionRule.userId, userId), eq(transactionRule.id, id)))
			.returning({ id: transactionRule.id });
		if (!row) {
			throw new NotFoundException("Rule not found");
		}
		return { success: true };
	}

	/** For sync: the Category the User's rules pick for a Transaction, or null. */
	async matcher(userId: string) {
		const rules = await this.db
			.select()
			.from(transactionRule)
			.where(eq(transactionRule.userId, userId));
		// An exact-amount rule is more specific than an any-amount one for the same merchant.
		const ordered = [...rules].sort(
			(a, b) => Number(a.amount === null) - Number(b.amount === null),
		);
		return (row: Matchable) => {
			const key = keyOf(row);
			const rule = ordered.find(
				(item) =>
					item.merchant.toLowerCase() === key &&
					(item.amount === null || item.amount === row.amount),
			);
			return rule?.categoryId ?? null;
		};
	}
}

/** Rows a rule applies to. Split rows keep the Categories the User gave each part. */
function matching(userId: string, merchant: string, amount: number | null): SQL[] {
	const where: SQL[] = [
		eq(transaction.userId, userId),
		sql`${merchantKey} = ${merchant.toLowerCase()}`,
		isNull(transaction.splitParentId),
		sql`not exists (select 1 from ${transaction} as split_part where split_part.split_parent_id = ${transaction.id})`,
	];
	if (amount !== null) {
		where.push(eq(transaction.amount, amount));
	}
	return where;
}
