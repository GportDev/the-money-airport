import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { category } from "../db/schema/category";
import { transaction } from "../db/schema/transaction";
import { type BudgetGroup, type CategoryKind, DEFAULT_CATEGORIES } from "./category-defaults";

export type CategoryDto = {
	id: string;
	name: string;
	color: string;
	icon: string;
	kind: CategoryKind;
	budgetGroup: BudgetGroup | null;
	isDefault: boolean;
	isUncategorized: boolean;
};

type CategoryInput = {
	name: string;
	color: string;
	icon: string;
	kind: CategoryKind;
	budgetGroup?: BudgetGroup | null;
};

@Injectable()
export class CategoriesService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/** Seeds the default Categories once per User. A User who deletes a default keeps it deleted. */
	async ensureDefaults(userId: string) {
		const [existing] = await this.db
			.select({ id: category.id })
			.from(category)
			.where(and(eq(category.userId, userId), eq(category.isUncategorized, true)))
			.limit(1);
		if (existing) {
			return;
		}
		await this.db
			.insert(category)
			.values(
				DEFAULT_CATEGORIES.map((seed) => ({
					userId,
					name: seed.name,
					icon: seed.icon,
					color: seed.color,
					kind: seed.kind,
					budgetGroup: seed.budgetGroup,
					isDefault: true,
					isUncategorized: seed.isUncategorized ?? false,
				})),
			)
			.onConflictDoNothing();
	}

	async list(userId: string): Promise<CategoryDto[]> {
		await this.ensureDefaults(userId);
		const rows = await this.db
			.select()
			.from(category)
			.where(eq(category.userId, userId))
			.orderBy(asc(category.kind), asc(category.name));
		return rows.map(toDto);
	}

	/** Name → id for every Category the User has, plus the Uncategorized id. */
	async lookup(userId: string) {
		const rows = await this.list(userId);
		const byName = new Map(rows.map((row) => [row.name.toLowerCase(), row]));
		const uncategorized = rows.find((row) => row.isUncategorized);
		if (!uncategorized) {
			throw new Error("Uncategorized Category is missing");
		}
		return { byName, byId: new Map(rows.map((row) => [row.id, row])), uncategorized };
	}

	async owned(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(category)
			.where(and(eq(category.id, id), eq(category.userId, userId)))
			.limit(1);
		if (!row) {
			throw new NotFoundException("Category not found");
		}
		return row;
	}

	async create(userId: string, input: CategoryInput) {
		await this.ensureDefaults(userId);
		const [row] = await this.db
			.insert(category)
			.values({
				userId,
				name: input.name.trim(),
				color: input.color,
				icon: input.icon,
				kind: input.kind,
				budgetGroup: input.kind === "income" ? null : (input.budgetGroup ?? "flexible"),
			})
			.onConflictDoNothing()
			.returning();
		if (!row) {
			throw new BadRequestException("A Category with that name already exists");
		}
		return toDto(row);
	}

	async update(userId: string, id: string, input: Partial<CategoryInput>) {
		const existing = await this.owned(userId, id);
		const kind = input.kind ?? (existing.kind as CategoryKind);
		if (existing.isUncategorized && input.kind && input.kind !== existing.kind) {
			throw new BadRequestException("Uncategorized keeps its kind");
		}
		const budgetGroup =
			kind === "income"
				? null
				: input.budgetGroup !== undefined
					? input.budgetGroup
					: (existing.budgetGroup ?? "flexible");
		try {
			const [row] = await this.db
				.update(category)
				.set({
					name: input.name?.trim() ?? existing.name,
					color: input.color ?? existing.color,
					icon: input.icon ?? existing.icon,
					kind,
					budgetGroup,
				})
				.where(and(eq(category.id, id), eq(category.userId, userId)))
				.returning();
			if (!row) {
				throw new NotFoundException("Category not found");
			}
			return toDto(row);
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new BadRequestException("A Category with that name already exists");
			}
			throw error;
		}
	}

	/** Moves the Category's Transactions to Uncategorized, then deletes it. */
	async remove(userId: string, id: string) {
		const existing = await this.owned(userId, id);
		if (existing.isUncategorized) {
			throw new BadRequestException("Uncategorized cannot be deleted");
		}
		const { uncategorized } = await this.lookup(userId);
		await this.db.transaction(async (tx) => {
			await tx
				.update(transaction)
				.set({ categoryId: uncategorized.id, updatedAt: sql`now()` })
				.where(and(eq(transaction.userId, userId), eq(transaction.categoryId, id)));
			await tx.delete(category).where(and(eq(category.id, id), eq(category.userId, userId)));
		});
		return { success: true };
	}
}

function toDto(row: typeof category.$inferSelect): CategoryDto {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		icon: row.icon,
		kind: row.kind as CategoryKind,
		budgetGroup: (row.budgetGroup as BudgetGroup | null) ?? null,
		isDefault: row.isDefault,
		isUncategorized: row.isUncategorized,
	};
}

function isUniqueViolation(error: unknown) {
	return Boolean(
		error &&
			typeof error === "object" &&
			(("code" in error && error.code === "23505") ||
				("cause" in error &&
					error.cause &&
					typeof error.cause === "object" &&
					"code" in error.cause &&
					error.cause.code === "23505")),
	);
}
