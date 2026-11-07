import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { transaction } from "../db/schema/transaction";
import { FxService } from "../fx/fx.service";
import type { CashFlowDay, CashFlowResponse, RunningBalanceKind } from "./cash-flow.types";

type Account = typeof bankAccount.$inferSelect;

const notTransfer = sql`not (${transaction.tags} && array['transfer','savings_transfer']::text[])`;

function pad(value: number) {
	return String(value).padStart(2, "0");
}

@Injectable()
export class CashFlowService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly fx: FxService,
	) {}

	async get(
		userId: string,
		year: number,
		month: number,
		accountId?: string,
	): Promise<CashFlowResponse> {
		const base = await this.accounts.baseCurrency(userId);
		const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
		const monthStart = `${year}-${pad(month)}-01`;
		const monthEnd = `${year}-${pad(month)}-${pad(daysInMonth)}`;

		const owned = await this.db.select().from(bankAccount).where(eq(bankAccount.userId, userId));
		const scoped = accountId ? owned.find((row) => row.id === accountId) : undefined;
		if (accountId && !scoped) {
			throw new NotFoundException("BankAccount not found");
		}

		const rates = new Map<string, Promise<number | null>>();
		const rateInto = (currency: string, onDate?: string) => {
			const key = `${currency}:${onDate ?? "latest"}`;
			let pending = rates.get(key);
			if (!pending) {
				pending = this.fx
					.rateFor(currency, base, onDate)
					// A future-dated row has no published rate yet; fall back to the latest one.
					.then((rate) => (rate === null && onDate ? this.fx.rateFor(currency, base) : rate));
				rates.set(key, pending);
			}
			return pending;
		};
		const omitted = new Set<string>();

		const income = new Array<number>(daysInMonth + 1).fill(0);
		const expenses = new Array<number>(daysInMonth + 1).fill(0);
		const totals = await this.db
			.select({
				date: transaction.date,
				currency: transaction.isoCurrencyCode,
				income: sql<string>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`,
				expenses: sql<string>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, monthStart),
					lte(transaction.date, monthEnd),
					notTransfer,
					accountId ? eq(transaction.bankAccountId, accountId) : undefined,
				),
			)
			.groupBy(transaction.date, transaction.isoCurrencyCode);

		for (const row of totals) {
			const rate = await rateInto(row.currency, row.date);
			if (rate === null) {
				omitted.add(row.currency);
				continue;
			}
			const day = Number(row.date.slice(8, 10));
			income[day] = (income[day] ?? 0) + Math.round(Number(row.income) * rate);
			expenses[day] = (expenses[day] ?? 0) + Math.round(Number(row.expenses) * rate);
		}

		const balanceAccounts = scoped ? [scoped] : owned.filter((row) => !row.isHidden);
		const runningBalanceKind: RunningBalanceKind = !scoped
			? "net_worth"
			: scoped.isAsset
				? "balance"
				: "owed";
		const balances = await this.runningBalances(
			userId,
			balanceAccounts,
			monthStart,
			daysInMonth,
			(currency) => rateInto(currency),
			omitted,
		);
		const today = new Date().toISOString().slice(0, 10);

		const daily: CashFlowDay[] = [];
		let totalIncome = 0;
		let totalExpenses = 0;
		for (let day = 1; day <= daysInMonth; day += 1) {
			const date = `${year}-${pad(month)}-${pad(day)}`;
			const dayIncome = income[day] ?? 0;
			const dayExpenses = expenses[day] ?? 0;
			totalIncome += dayIncome;
			totalExpenses += dayExpenses;
			const contribution = balances?.[day];
			let runningBalance: number | null = null;
			if (contribution !== undefined && date <= today) {
				// Contributions are net-worth signed; one liability reads as the amount owed.
				runningBalance = runningBalanceKind === "owed" ? -contribution : contribution;
			}
			daily.push({
				day,
				date,
				income: dayIncome,
				expenses: dayExpenses,
				net: dayIncome - dayExpenses,
				runningBalance,
			});
		}

		return {
			year,
			month,
			baseCurrency: base,
			accountId: accountId ?? null,
			runningBalanceKind,
			summary: {
				totalIncome,
				totalExpenses,
				netCashFlow: totalIncome - totalExpenses,
			},
			daily,
			omittedCurrencies: [...omitted].sort(),
		};
	}

	/**
	 * End-of-day net-worth contribution per day, walked back from today's balances:
	 * value(d) = signed current balance - sum of every later Transaction on the account.
	 * Transfers count here: they move balances even though they are not income or spend.
	 */
	private async runningBalances(
		userId: string,
		accounts: Account[],
		monthStart: string,
		daysInMonth: number,
		rateInto: (currency: string) => Promise<number | null>,
		omitted: Set<string>,
	) {
		const usable: { account: Account; rate: number }[] = [];
		for (const account of accounts) {
			const rate = await rateInto(account.isoCurrencyCode);
			if (rate === null) {
				omitted.add(account.isoCurrencyCode);
				continue;
			}
			usable.push({ account, rate });
		}
		if (usable.length === 0) {
			return null;
		}

		const later = await this.db
			.select({
				bankAccountId: transaction.bankAccountId,
				date: transaction.date,
				amount: sql<string>`sum(${transaction.amount})`,
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					gte(transaction.date, monthStart),
					inArray(
						transaction.bankAccountId,
						usable.map(({ account }) => account.id),
					),
				),
			)
			.groupBy(transaction.bankAccountId, transaction.date);

		const byAccount = new Map<string, { date: string; amount: number }[]>();
		for (const row of later) {
			if (!row.bankAccountId) continue;
			const list = byAccount.get(row.bankAccountId) ?? [];
			list.push({ date: row.date, amount: Number(row.amount) });
			byAccount.set(row.bankAccountId, list);
		}

		const values = new Array<number>(daysInMonth + 1).fill(0);
		const prefix = monthStart.slice(0, 8);
		for (const { account, rate } of usable) {
			const rows = byAccount.get(account.id) ?? [];
			const signedCurrent = account.isAsset ? account.currentBalance : -account.currentBalance;
			for (let day = 1; day <= daysInMonth; day += 1) {
				const date = `${prefix}${pad(day)}`;
				let after = 0;
				for (const row of rows) {
					if (row.date > date) after += row.amount;
				}
				values[day] = (values[day] ?? 0) + Math.round((signedCurrent - after) * rate);
			}
		}
		return values;
	}
}
