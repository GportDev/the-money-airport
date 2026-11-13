import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CategoriesService } from "../categories/categories.service";
import { SAVINGS_TRANSFER } from "../categories/category-defaults";
import { DATABASE } from "../db/db.module";
import { forecastCell, forecastRow } from "../db/schema/forecast";
import type { ForecastRowDto, RowInput, RowPatch } from "./forecast.types";
import { ForecastSectionsService } from "./forecast-sections.service";
import { assertPlanLinks } from "./plan-links";
import type { SectionType } from "./projection";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

@Injectable()
export class ForecastRowsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly sections: ForecastSectionsService,
		private readonly categories: CategoriesService,
	) {}

	async create(userId: string, input: RowInput): Promise<ForecastRowDto> {
		const section = await this.sections.owned(userId, input.sectionId);
		assertFundOnlyOnSavings(section.type, input.goalId);
		await assertPlanLinks(this.db, userId, input);
		const [row] = await this.db
			.insert(forecastRow)
			.values({
				userId,
				sectionId: section.id,
				name: input.name,
				dayOfMonth: input.dayOfMonth ?? null,
				categoryId: input.categoryId ?? null,
				bankAccountId: input.bankAccountId ?? null,
				goalId: input.goalId ?? null,
				sortOrder: await this.nextSortOrder(userId, section.id),
			})
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	async update(userId: string, id: string, patch: RowPatch): Promise<ForecastRowDto> {
		const existing = await this.owned(userId, id);
		const section = await this.sections.owned(userId, existing.sectionId);
		assertFundOnlyOnSavings(section.type, patch.goalId);
		await assertPlanLinks(this.db, userId, patch);
		const [row] = await this.db
			.update(forecastRow)
			.set(patch)
			.where(and(eq(forecastRow.id, id), eq(forecastRow.userId, userId)))
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	/** Writes Plan amounts for one year; `copyToAll` spreads the first given amount to all months. */
	async setAmounts(
		userId: string,
		id: string,
		input: { year: number; amounts: Record<number, number>; copyToAll?: boolean },
	): Promise<ForecastRowDto> {
		const row = await this.owned(userId, id);
		const entries = amountEntries(input.amounts, input.copyToAll ?? false);
		if (entries.length > 0) {
			await this.db
				.insert(forecastCell)
				.values(
					entries.map(([month, amount]) => ({
						forecastRowId: id,
						year: input.year,
						month,
						amount,
					})),
				)
				.onConflictDoUpdate({
					target: [forecastCell.forecastRowId, forecastCell.year, forecastCell.month],
					set: { amount: sql`excluded.amount`, updatedAt: new Date() },
				});
		}
		return row;
	}

	async remove(userId: string, id: string) {
		await this.owned(userId, id);
		await this.db
			.delete(forecastRow)
			.where(and(eq(forecastRow.id, id), eq(forecastRow.userId, userId)));
		return { success: true };
	}

	/** One-shot seed: one row per Category not yet on the plan, Uncategorized left out. */
	async fromCategories(userId: string): Promise<ForecastRowDto[]> {
		const [sections, categories, linked] = await Promise.all([
			this.sections.list(userId),
			this.categories.list(userId),
			this.db
				.select({ categoryId: forecastRow.categoryId })
				.from(forecastRow)
				.where(and(eq(forecastRow.userId, userId), isNotNull(forecastRow.categoryId))),
		]);
		const linkedIds = new Set(linked.map((row) => row.categoryId));
		const sectionByType = new Map(sections.map((section) => [section.type, section.id]));
		const values = categories
			.filter((item) => !item.isUncategorized && !linkedIds.has(item.id))
			.flatMap((item) => {
				const sectionId = sectionByType.get(sectionTypeFor(item));
				return sectionId ? [{ userId, sectionId, name: item.name, categoryId: item.id }] : [];
			});
		if (values.length === 0) {
			return [];
		}
		const created = await this.db.insert(forecastRow).values(values).returning();
		return created.map(toDto);
	}

	async owned(userId: string, id: string): Promise<ForecastRowDto> {
		const [row] = await this.db
			.select()
			.from(forecastRow)
			.where(and(eq(forecastRow.id, id), eq(forecastRow.userId, userId)))
			.limit(1);
		if (!row) throw new NotFoundException("Row not found");
		return toDto(row);
	}

	private async nextSortOrder(userId: string, sectionId: string) {
		const [row] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(forecastRow)
			.where(and(eq(forecastRow.userId, userId), eq(forecastRow.sectionId, sectionId)));
		return row?.count ?? 0;
	}
}

/** PRD F12.10: income → revenue, Savings Transfer → savings, fixed → fixed, the rest variable. */
function sectionTypeFor(item: { name: string; kind: string; budgetGroup: string | null }) {
	if (item.kind === "income") return "revenue";
	if (item.name === SAVINGS_TRANSFER) return "savings";
	return item.budgetGroup === "fixed" ? "fixed_expense" : "variable_expense";
}

function assertFundOnlyOnSavings(type: SectionType, goalId: string | null | undefined) {
	if (goalId && type !== "savings") {
		throw new BadRequestException("Only savings rows can point at a Fund");
	}
}

function amountEntries(amounts: Record<number, number>, copyToAll: boolean): [number, number][] {
	const given = Object.entries(amounts)
		.map(([month, amount]) => [Number(month), amount] as [number, number])
		.sort((a, b) => a[0] - b[0]);
	const first = given[0];
	if (!copyToAll || !first) {
		return given;
	}
	return MONTHS.map((month) => [month, first[1]]);
}

function toDto(row: typeof forecastRow.$inferSelect): ForecastRowDto {
	return {
		id: row.id,
		sectionId: row.sectionId,
		name: row.name,
		dayOfMonth: row.dayOfMonth,
		categoryId: row.categoryId,
		bankAccountId: row.bankAccountId,
		goalId: row.goalId,
		sortOrder: row.sortOrder,
	};
}
