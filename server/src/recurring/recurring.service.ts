import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { category } from "../db/schema/category";
import { recurringItem } from "../db/schema/recurring-item";
import { transaction } from "../db/schema/transaction";
import { addDays, lastDayOf, todayIso } from "../forecast/dates";
import { FxService } from "../fx/fx.service";
import { detectPatterns, merchantKey } from "./detection";
import type {
	Cadence,
	CreateRecurringInput,
	RecurringCandidate,
	RecurringListItem,
	RecurringMonth,
	UpdateRecurringInput,
} from "./recurring.types";
import { daysBetween, nextOccurrence, occurrencesThrough } from "./schedule";

type ItemRow = typeof recurringItem.$inferSelect;
type AccountRef = { id: string; name: string; isoCurrencyCode: string };

/** Thirteen months, so a yearly bill shows up twice. */
const HISTORY_DAYS = 400;
const merchantOf = sql<string>`coalesce(${transaction.merchantName}, ${transaction.name})`;

@Injectable()
export class RecurringService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly fx: FxService,
	) {}

	async month(userId: string, month: string): Promise<RecurringMonth> {
		const [rows, accounts, base] = await Promise.all([
			this.db
				.select()
				.from(recurringItem)
				.where(eq(recurringItem.userId, userId))
				.orderBy(desc(recurringItem.isActive), asc(recurringItem.nextDate)),
			this.accountRefs(userId),
			this.accounts.baseCurrency(userId),
		]);
		const today = todayIso();
		const monthStart = `${month}-01`;
		const monthEnd = `${month}-${String(lastDayOf(month)).padStart(2, "0")}`;
		let remainingDue = 0;
		let paid = 0;
		for (const row of rows.filter((item) => item.isActive)) {
			const currency = currencyOf(row, accounts, base);
			const due = occurrencesThrough(row.nextDate, cadenceOf(row), monthEnd).filter(
				(date) => date >= monthStart || date < today,
			);
			remainingDue += (await this.toBase(row.amount, currency, base)) * due.length;
			if (row.lastPaidOn && row.lastPaidOn >= monthStart && row.lastPaidOn <= monthEnd) {
				paid += await this.toBase(row.amount, currency, base);
			}
		}
		return {
			month,
			baseCurrency: base,
			remainingDue,
			paid,
			items: rows.map((row) => toListItem(row, accounts, base, today)),
		};
	}

	/** The next few active items for the Dashboard widget. */
	async upcoming(userId: string, limit: number) {
		const summary = await this.month(userId, todayIso().slice(0, 7));
		return {
			remainingDue: summary.remainingDue,
			upcoming: summary.items.filter((item) => item.isActive).slice(0, limit),
		};
	}

	async create(userId: string, input: CreateRecurringInput) {
		await this.assertLinks(userId, input);
		const [row] = await this.db
			.insert(recurringItem)
			.values({
				userId,
				merchantName: input.merchantName,
				merchantLogoUrl: await this.logoFor(userId, input.merchantName),
				amount: input.amount,
				cadence: input.cadence,
				nextDate: input.nextDate,
				bankAccountId: input.bankAccountId ?? null,
				categoryId: input.categoryId ?? null,
				isActive: input.isActive ?? true,
				isManual: input.isManual ?? true,
			})
			.returning();
		if (!row) throw new Error("Could not create recurring item");
		return this.toDto(userId, row);
	}

	async update(userId: string, id: string, input: UpdateRecurringInput) {
		await this.owned(userId, id);
		return this.write(userId, id, input);
	}

	/** Advances the schedule one period and records the payment; no Transaction is inserted. */
	async markPaid(userId: string, id: string, date?: string) {
		const row = await this.owned(userId, id);
		return this.write(userId, id, {
			lastPaidOn: date ?? todayIso(),
			nextDate: nextOccurrence(row.nextDate, cadenceOf(row)),
		});
	}

	async skip(userId: string, id: string) {
		const row = await this.owned(userId, id);
		return this.write(userId, id, { nextDate: nextOccurrence(row.nextDate, cadenceOf(row)) });
	}

	async remove(userId: string, id: string) {
		await this.owned(userId, id);
		await this.db
			.delete(recurringItem)
			.where(and(eq(recurringItem.id, id), eq(recurringItem.userId, userId)));
		return { success: true };
	}

	/** Patterns in the last 13 months of outflows that no RecurringItem tracks yet. */
	async detect(userId: string): Promise<RecurringCandidate[]> {
		const today = todayIso();
		const [charges, tracked, accounts, base] = await Promise.all([
			this.db
				.select({
					merchant: merchantOf,
					merchantLogoUrl: transaction.merchantLogoUrl,
					amount: transaction.amount,
					date: transaction.date,
					bankAccountId: transaction.bankAccountId,
					categoryId: transaction.categoryId,
					isoCurrencyCode: transaction.isoCurrencyCode,
				})
				.from(transaction)
				.where(
					and(
						eq(transaction.userId, userId),
						lt(transaction.amount, 0),
						gte(transaction.date, addDays(today, -HISTORY_DAYS)),
					),
				),
			this.db
				.select({
					merchantName: recurringItem.merchantName,
					bankAccountId: recurringItem.bankAccountId,
				})
				.from(recurringItem)
				.where(eq(recurringItem.userId, userId)),
			this.accountRefs(userId),
			this.accounts.baseCurrency(userId),
		]);
		const isTracked = (merchant: string, bankAccountId: string | null) =>
			tracked.some(
				(item) =>
					merchantKey(item.merchantName) === merchantKey(merchant) &&
					(item.bankAccountId === null || item.bankAccountId === bankAccountId),
			);
		return detectPatterns(charges, today)
			.filter((pattern) => !isTracked(pattern.merchant, pattern.bankAccountId))
			.sort((a, b) => a.nextDate.localeCompare(b.nextDate))
			.map((pattern) => {
				const account = pattern.bankAccountId ? accounts.get(pattern.bankAccountId) : undefined;
				return {
					merchantName: pattern.merchant,
					merchantLogoUrl: pattern.merchantLogoUrl,
					amount: pattern.amount,
					isoCurrencyCode: account?.isoCurrencyCode ?? base,
					cadence: pattern.cadence,
					nextDate: pattern.nextDate,
					daysUntil: daysBetween(today, pattern.nextDate),
					categoryId: pattern.categoryId,
					account: account ? { id: account.id, name: account.name } : null,
				};
			});
	}

	private async write(userId: string, id: string, values: Partial<ItemRow>) {
		const [row] = await this.db
			.update(recurringItem)
			.set({ ...values, updatedAt: new Date() })
			.where(and(eq(recurringItem.id, id), eq(recurringItem.userId, userId)))
			.returning();
		if (!row) throw new NotFoundException("Recurring item not found");
		return this.toDto(userId, row);
	}

	private async owned(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(recurringItem)
			.where(and(eq(recurringItem.id, id), eq(recurringItem.userId, userId)))
			.limit(1);
		if (!row) throw new NotFoundException("Recurring item not found");
		return row;
	}

	private async toDto(userId: string, row: ItemRow) {
		const [accounts, base] = await Promise.all([
			this.accountRefs(userId),
			this.accounts.baseCurrency(userId),
		]);
		return toListItem(row, accounts, base, todayIso());
	}

	private async assertLinks(userId: string, input: CreateRecurringInput) {
		if (input.bankAccountId) {
			const [found] = await this.db
				.select({ id: bankAccount.id })
				.from(bankAccount)
				.where(and(eq(bankAccount.id, input.bankAccountId), eq(bankAccount.userId, userId)))
				.limit(1);
			if (!found) throw new NotFoundException("BankAccount not found");
		}
		if (input.categoryId) {
			const [found] = await this.db
				.select({ id: category.id })
				.from(category)
				.where(and(eq(category.id, input.categoryId), eq(category.userId, userId)))
				.limit(1);
			if (!found) throw new NotFoundException("Category not found");
		}
	}

	/** The logo comes from the latest matching Transaction, never from client input. */
	private async logoFor(userId: string, merchantName: string) {
		const [row] = await this.db
			.select({ logo: transaction.merchantLogoUrl })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					sql`lower(${merchantOf}) = ${merchantKey(merchantName)}`,
					sql`${transaction.merchantLogoUrl} is not null`,
				),
			)
			.orderBy(desc(transaction.date))
			.limit(1);
		return row?.logo ?? null;
	}

	private async accountRefs(userId: string) {
		const rows = await this.db
			.select({
				id: bankAccount.id,
				name: bankAccount.name,
				isoCurrencyCode: bankAccount.isoCurrencyCode,
			})
			.from(bankAccount)
			.where(eq(bankAccount.userId, userId));
		return new Map<string, AccountRef>(rows.map((row) => [row.id, row]));
	}

	/** Falls back to the native amount when no rate is known, rather than dropping the bill. */
	private async toBase(cents: number, from: string, base: string) {
		return (await this.fx.convert(cents, from, base)) ?? cents;
	}
}

function cadenceOf(row: ItemRow) {
	return row.cadence as Cadence;
}

function currencyOf(row: ItemRow, accounts: Map<string, AccountRef>, base: string) {
	return (row.bankAccountId ? accounts.get(row.bankAccountId)?.isoCurrencyCode : null) ?? base;
}

function toListItem(
	row: ItemRow,
	accounts: Map<string, AccountRef>,
	base: string,
	today: string,
): RecurringListItem {
	const account = row.bankAccountId ? accounts.get(row.bankAccountId) : undefined;
	return {
		id: row.id,
		merchantName: row.merchantName,
		merchantLogoUrl: row.merchantLogoUrl,
		amount: row.amount,
		isoCurrencyCode: currencyOf(row, accounts, base),
		cadence: cadenceOf(row),
		nextDate: row.nextDate,
		daysUntil: daysBetween(today, row.nextDate),
		categoryId: row.categoryId,
		account: account ? { id: account.id, name: account.name } : null,
		lastPaidOn: row.lastPaidOn,
		isActive: row.isActive,
		isManual: row.isManual,
	};
}
