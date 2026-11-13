import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { CategoriesService } from "../categories/categories.service";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { bankAccount } from "../db/schema/bank-account";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import { carryForward, eachDay, eachMonth } from "./report-dates";
import type {
	BalanceHistoryReport,
	CashFlowTrendReport,
	CategoryTotal,
	IncomeVsExpensesReport,
	ReportRange,
	SpendingReport,
} from "./reports.types";

const notTransfer = sql`not (${transaction.tags} && array['transfer','savings_transfer']::text[])`;

type RateLookup = (currency: string, onDate?: string) => Promise<number | null>;

function inRange(userId: string, range: ReportRange) {
	return and(
		eq(transaction.userId, userId),
		gte(transaction.date, range.dateFrom),
		lte(transaction.date, range.dateTo),
		notTransfer,
	);
}

@Injectable()
export class ReportsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly categories: CategoriesService,
		private readonly fx: FxService,
	) {}

	/** Expense Categories net of refunds, like Budget actuals; Categories that netted ≤ 0 drop out. */
	async spendingByCategory(userId: string, range: ReportRange, limit?: number) {
		const [base, categories] = await Promise.all([
			this.accounts.baseCurrency(userId),
			this.categories.list(userId),
		]);
		const rateInto = this.rateLookup(base);
		const omitted = new Set<string>();
		const rows = await this.db
			.select({
				categoryId: transaction.categoryId,
				currency: transaction.isoCurrencyCode,
				date: transaction.date,
				amount: sql<string>`sum(${transaction.amount})`,
			})
			.from(transaction)
			.where(inRange(userId, range))
			.groupBy(transaction.categoryId, transaction.isoCurrencyCode, transaction.date);

		const net = new Map<string, number>();
		for (const row of rows) {
			const rate = await rateInto(row.currency, row.date);
			if (rate === null) {
				omitted.add(row.currency);
				continue;
			}
			net.set(
				row.categoryId,
				(net.get(row.categoryId) ?? 0) + Math.round(Number(row.amount) * rate),
			);
		}

		const totals: CategoryTotal[] = categories
			.filter((row) => row.kind === "expense")
			.map((row) => ({
				categoryId: row.id,
				categoryName: row.name,
				color: row.color,
				icon: row.icon,
				total: -(net.get(row.id) ?? 0),
			}))
			.filter((row) => row.total > 0)
			.sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName));

		return {
			baseCurrency: base,
			omittedCurrencies: [...omitted].sort(),
			categories: limit === undefined ? totals : totals.slice(0, limit),
		} satisfies SpendingReport;
	}

	/** Cash Flow rules: positive amounts are income, negative are expenses, Transfers excluded. */
	async incomeVsExpenses(userId: string, range: ReportRange): Promise<IncomeVsExpensesReport> {
		const base = await this.accounts.baseCurrency(userId);
		const rateInto = this.rateLookup(base);
		const omitted = new Set<string>();
		const months = new Map(
			eachMonth(range.dateFrom, range.dateTo).map((month) => [
				month,
				{ month, income: 0, expenses: 0 },
			]),
		);
		const rows = await this.db
			.select({
				date: transaction.date,
				currency: transaction.isoCurrencyCode,
				income: sql<string>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`,
				expenses: sql<string>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`,
			})
			.from(transaction)
			.where(inRange(userId, range))
			.groupBy(transaction.date, transaction.isoCurrencyCode);

		for (const row of rows) {
			const rate = await rateInto(row.currency, row.date);
			const bucket = months.get(row.date.slice(0, 7));
			if (rate === null) {
				omitted.add(row.currency);
				continue;
			}
			if (!bucket) continue;
			bucket.income += Math.round(Number(row.income) * rate);
			bucket.expenses += Math.round(Number(row.expenses) * rate);
		}

		return {
			baseCurrency: base,
			omittedCurrencies: [...omitted].sort(),
			months: [...months.values()],
		};
	}

	async cashFlowTrend(userId: string, range: ReportRange): Promise<CashFlowTrendReport> {
		const flow = await this.incomeVsExpenses(userId, range);
		return {
			baseCurrency: flow.baseCurrency,
			omittedCurrencies: flow.omittedCurrencies,
			months: flow.months.map((row) => ({ month: row.month, net: row.income - row.expenses })),
		};
	}

	/**
	 * Daily balances of visible BankAccounts (or one owned account) from balance snapshots,
	 * converted at the latest rate so the lines move with the balance, not with FX.
	 */
	async balanceHistory(
		userId: string,
		range: ReportRange,
		accountId?: string,
	): Promise<BalanceHistoryReport> {
		const base = await this.accounts.baseCurrency(userId);
		const owned = await this.db
			.select()
			.from(bankAccount)
			.where(eq(bankAccount.userId, userId))
			.orderBy(asc(bankAccount.name));
		const scoped = accountId ? owned.filter((row) => row.id === accountId) : owned;
		if (accountId && scoped.length === 0) {
			throw new NotFoundException("BankAccount not found");
		}
		const accounts = accountId ? scoped : scoped.filter((row) => !row.isHidden);
		const omitted = new Set<string>();
		const rateInto = this.rateLookup(base);

		const snapshots =
			accounts.length === 0
				? []
				: await this.db
						.select({
							bankAccountId: accountBalanceSnapshot.bankAccountId,
							date: accountBalanceSnapshot.date,
							balance: accountBalanceSnapshot.balance,
						})
						.from(accountBalanceSnapshot)
						.where(
							and(
								eq(accountBalanceSnapshot.userId, userId),
								lte(accountBalanceSnapshot.date, range.dateTo),
								inArray(
									accountBalanceSnapshot.bankAccountId,
									accounts.map((row) => row.id),
								),
							),
						)
						.orderBy(asc(accountBalanceSnapshot.date));

		const byAccount = new Map<string, { date: string; balance: number }[]>();
		for (const snap of snapshots) {
			const list = byAccount.get(snap.bankAccountId) ?? [];
			list.push({ date: snap.date, balance: snap.balance });
			byAccount.set(snap.bankAccountId, list);
		}

		const days = eachDay(range.dateFrom, range.dateTo);
		const points: BalanceHistoryReport["points"] = [];
		for (const account of accounts) {
			const rate = await rateInto(account.isoCurrencyCode);
			if (rate === null) {
				omitted.add(account.isoCurrencyCode);
				continue;
			}
			for (const point of carryForward(byAccount.get(account.id) ?? [], days)) {
				points.push({
					date: point.date,
					accountId: account.id,
					balance: Math.round(point.balance * rate),
				});
			}
		}
		points.sort((a, b) => a.date.localeCompare(b.date));

		return {
			baseCurrency: base,
			omittedCurrencies: [...omitted].sort(),
			accounts: accounts.map((row) => ({
				accountId: row.id,
				name: row.name,
				isAsset: row.isAsset,
			})),
			points,
		};
	}

	/** Memoised rate into Base; a day with no published rate falls back to the latest one. */
	private rateLookup(base: string): RateLookup {
		const rates = new Map<string, Promise<number | null>>();
		return (currency, onDate) => {
			const key = `${currency}:${onDate ?? "latest"}`;
			let pending = rates.get(key);
			if (!pending) {
				pending = this.fx
					.rateFor(currency, base, onDate)
					.then((rate) => (rate === null && onDate ? this.fx.rateFor(currency, base) : rate));
				rates.set(key, pending);
			}
			return pending;
		};
	}
}
