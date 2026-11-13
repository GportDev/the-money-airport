import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { forecastSection } from "../db/schema/forecast";
import type { ForecastSectionDto } from "./forecast.types";
import type { SectionType } from "./projection";

const DEFAULT_SECTIONS: { name: string; type: SectionType }[] = [
	{ name: "Revenue", type: "revenue" },
	{ name: "Savings", type: "savings" },
	{ name: "Fixed expenses", type: "fixed_expense" },
	{ name: "Variable expenses", type: "variable_expense" },
];

@Injectable()
export class ForecastSectionsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	/** Sections in display order; a User with none gets the four defaults first. */
	async list(userId: string): Promise<ForecastSectionDto[]> {
		const existing = await this.rows(userId);
		if (existing.length > 0) {
			return existing;
		}
		await this.db
			.insert(forecastSection)
			.values(DEFAULT_SECTIONS.map((section, index) => ({ ...section, userId, sortOrder: index })))
			.onConflictDoNothing();
		return this.rows(userId);
	}

	async create(userId: string, input: { name: string; type: SectionType }) {
		const sections = await this.list(userId);
		const [row] = await this.db
			.insert(forecastSection)
			.values({ ...input, userId, sortOrder: sections.length })
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	async update(userId: string, id: string, input: { name?: string; sortOrder?: number }) {
		await this.owned(userId, id);
		const [row] = await this.db
			.update(forecastSection)
			.set(input)
			.where(and(eq(forecastSection.id, id), eq(forecastSection.userId, userId)))
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	async remove(userId: string, id: string) {
		await this.owned(userId, id);
		await this.db
			.delete(forecastSection)
			.where(and(eq(forecastSection.id, id), eq(forecastSection.userId, userId)));
		return { success: true };
	}

	async owned(userId: string, id: string): Promise<ForecastSectionDto> {
		const [row] = await this.db
			.select()
			.from(forecastSection)
			.where(and(eq(forecastSection.id, id), eq(forecastSection.userId, userId)))
			.limit(1);
		if (!row) throw new NotFoundException("Section not found");
		return toDto(row);
	}

	private async rows(userId: string) {
		const rows = await this.db
			.select()
			.from(forecastSection)
			.where(eq(forecastSection.userId, userId))
			.orderBy(asc(forecastSection.sortOrder), asc(forecastSection.createdAt));
		return rows.map(toDto);
	}
}

function toDto(row: typeof forecastSection.$inferSelect): ForecastSectionDto {
	return {
		id: row.id,
		name: row.name,
		// Narrowed on write by the controller's enum.
		type: row.type as SectionType,
		sortOrder: row.sortOrder,
	};
}
