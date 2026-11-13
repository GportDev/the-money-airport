import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { forecastOneOff } from "../db/schema/forecast";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import { SettingsService } from "../settings/settings.service";
import { addDays } from "./dates";
import type { OneOffDto, OneOffInput, OneOffPatch, OneOffStatus } from "./forecast.types";
import { ForecastSectionsService } from "./forecast-sections.service";
import { assertPlanLinks } from "./plan-links";

/** CONTEXT One-off: a Transaction matches within 5% of the amount and 7 days of the date. */
const MATCH_AMOUNT_TOLERANCE = 0.05;
const MATCH_WINDOW_DAYS = 7;

type Candidate = { id: string; date: string; amount: number; bankAccountId: string | null };

@Injectable()
export class OneOffsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly sections: ForecastSectionsService,
		private readonly settings: SettingsService,
		private readonly fx: FxService,
	) {}

	async list(userId: string, year: number, status?: OneOffStatus): Promise<OneOffDto[]> {
		const filters = [
			eq(forecastOneOff.userId, userId),
			gte(forecastOneOff.date, `${year}-01-01`),
			lte(forecastOneOff.date, `${year}-12-31`),
		];
		if (status) filters.push(eq(forecastOneOff.status, status));
		const rows = await this.db
			.select()
			.from(forecastOneOff)
			.where(and(...filters))
			.orderBy(asc(forecastOneOff.date), asc(forecastOneOff.createdAt));
		return rows.map(toDto);
	}

	async create(userId: string, input: OneOffInput): Promise<OneOffDto> {
		await this.sections.owned(userId, input.sectionId);
		await assertPlanLinks(this.db, userId, input);
		const [row] = await this.db
			.insert(forecastOneOff)
			.values({
				userId,
				sectionId: input.sectionId,
				name: input.name,
				date: input.date,
				amount: input.amount,
				bankAccountId: input.bankAccountId ?? null,
				categoryId: input.categoryId ?? null,
				goalId: input.goalId ?? null,
			})
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	async update(userId: string, id: string, patch: OneOffPatch): Promise<OneOffDto> {
		await this.owned(userId, id);
		await assertPlanLinks(this.db, userId, patch);
		const [row] = await this.db
			.update(forecastOneOff)
			.set({ ...patch, updatedAt: new Date() })
			.where(and(eq(forecastOneOff.id, id), eq(forecastOneOff.userId, userId)))
			.returning();
		if (!row) throw new NotFoundException();
		return toDto(row);
	}

	async remove(userId: string, id: string) {
		await this.owned(userId, id);
		await this.db
			.delete(forecastOneOff)
			.where(and(eq(forecastOneOff.id, id), eq(forecastOneOff.userId, userId)));
		return { success: true };
	}

	/** After a sync: marks each expected One-off done when a Transaction matches it. */
	async matchAfterSync(userId: string) {
		const expected = await this.db
			.select()
			.from(forecastOneOff)
			.where(and(eq(forecastOneOff.userId, userId), eq(forecastOneOff.status, "expected")));
		if (expected.length === 0) {
			return;
		}
		const taken = await this.matchedTransactionIds(userId);
		const base = (await this.settings.get(userId)).currency;
		for (const oneOff of expected) {
			const match = await this.bestMatch(userId, oneOff, base, taken);
			if (!match) continue;
			taken.add(match.id);
			await this.db
				.update(forecastOneOff)
				.set({ status: "done", matchedTransactionId: match.id, updatedAt: new Date() })
				.where(eq(forecastOneOff.id, oneOff.id));
		}
	}

	private async bestMatch(
		userId: string,
		oneOff: typeof forecastOneOff.$inferSelect,
		base: string,
		taken: Set<string>,
	) {
		const rows = await this.db
			.select({
				id: transaction.id,
				date: transaction.date,
				amount: transaction.amount,
				currency: transaction.isoCurrencyCode,
				bankAccountId: transaction.bankAccountId,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, addDays(oneOff.date, -MATCH_WINDOW_DAYS)),
					lte(transaction.date, addDays(oneOff.date, MATCH_WINDOW_DAYS)),
				),
			);
		const candidates: Candidate[] = [];
		for (const row of rows) {
			const amount = await this.fx.convert(row.amount, row.currency, base);
			if (amount !== null && !taken.has(row.id)) candidates.push({ ...row, amount });
		}
		return closest(
			oneOff,
			candidates.filter((candidate) => isMatch(oneOff, candidate)),
		);
	}

	private async matchedTransactionIds(userId: string) {
		const rows = await this.db
			.select({ id: forecastOneOff.matchedTransactionId })
			.from(forecastOneOff)
			.where(
				and(eq(forecastOneOff.userId, userId), isNotNull(forecastOneOff.matchedTransactionId)),
			);
		return new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
	}

	private async owned(userId: string, id: string) {
		const [row] = await this.db
			.select({ id: forecastOneOff.id })
			.from(forecastOneOff)
			.where(and(eq(forecastOneOff.id, id), eq(forecastOneOff.userId, userId)))
			.limit(1);
		if (!row) throw new NotFoundException("One-off not found");
		return row;
	}
}

function isMatch(oneOff: typeof forecastOneOff.$inferSelect, candidate: Candidate) {
	const isSameSign = Math.sign(candidate.amount) === Math.sign(oneOff.amount);
	const isCloseAmount =
		Math.abs(Math.abs(candidate.amount) - Math.abs(oneOff.amount)) <=
		Math.abs(oneOff.amount) * MATCH_AMOUNT_TOLERANCE;
	const isSameAccount = !oneOff.bankAccountId || candidate.bankAccountId === oneOff.bankAccountId;
	return isSameSign && isCloseAmount && isSameAccount;
}

/** The candidate nearest in amount, then in date. */
function closest(oneOff: typeof forecastOneOff.$inferSelect, candidates: Candidate[]) {
	const distance = (candidate: Candidate) => [
		Math.abs(candidate.amount - oneOff.amount),
		Math.abs(Date.parse(candidate.date) - Date.parse(oneOff.date)),
	];
	return (
		candidates.sort((a, b) => {
			const [amountA = 0, dateA = 0] = distance(a);
			const [amountB = 0, dateB = 0] = distance(b);
			return amountA - amountB || dateA - dateB;
		})[0] ?? null
	);
}

function toDto(row: typeof forecastOneOff.$inferSelect): OneOffDto {
	return {
		id: row.id,
		sectionId: row.sectionId,
		name: row.name,
		date: row.date,
		amount: row.amount,
		bankAccountId: row.bankAccountId,
		categoryId: row.categoryId,
		goalId: row.goalId,
		// Narrowed on write by the controller's enum.
		status: row.status as OneOffStatus,
		matchedTransactionId: row.matchedTransactionId,
	};
}
