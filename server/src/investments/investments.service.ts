import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import type { BankAccountDto } from "../accounts/accounts.types";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { FxService } from "../fx/fx.service";
import { carryForward, eachDay, shiftDays, todayIso } from "../reports/report-dates";
import type {
	InvestmentAccountDto,
	InvestmentRange,
	InvestmentsResponse,
} from "./investments.types";

const RANGE_DAYS: Record<InvestmentRange, number> = { "1m": 29, "3m": 89, "1y": 364 };

type Snapshot = { date: string; balance: number };

@Injectable()
export class InvestmentsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly accounts: AccountsService,
		private readonly fx: FxService,
	) {}

	async get(userId: string, range: InvestmentRange): Promise<InvestmentsResponse> {
		const base = await this.accounts.baseCurrency(userId);
		const investments = (await this.accounts.list(userId)).filter(
			(row) => row.displayGroup === "investment" && !row.isHidden,
		);
		const end = todayIso();
		const days = eachDay(shiftDays(end, -RANGE_DAYS[range]), end);
		const snapshots = await this.snapshotsByAccount(
			userId,
			investments.map((row) => row.id),
			end,
		);
		const omitted = new Set<string>();

		const rows: InvestmentAccountDto[] = [];
		let total = 0;
		let change = 0;
		for (const account of investments) {
			const series = carryForward(snapshots.get(account.id) ?? [], days);
			const row = toInvestmentAccount(account, series);
			const [value, movedInBase] = await Promise.all([
				this.fx.convert(account.currentBalance, account.isoCurrencyCode, base),
				this.fx.convert(row.change, account.isoCurrencyCode, base),
			]);
			if (value === null || movedInBase === null) {
				omitted.add(account.isoCurrencyCode);
			} else {
				total += value;
				change += movedInBase;
			}
			rows.push({ ...row, value });
		}
		rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.name.localeCompare(b.name));
		const startTotal = total - change;

		return {
			range,
			baseCurrency: base,
			total,
			change,
			changePercent: startTotal === 0 ? 0 : change / Math.abs(startTotal),
			allocation: rows.flatMap((row) =>
				row.value === null ? [] : [{ accountId: row.id, name: row.name, value: row.value }],
			),
			accounts: rows,
			omittedCurrencies: [...omitted].sort(),
		};
	}

	private async snapshotsByAccount(userId: string, accountIds: string[], end: string) {
		const byAccount = new Map<string, Snapshot[]>();
		if (accountIds.length === 0) {
			return byAccount;
		}
		const rows = await this.db
			.select({
				bankAccountId: accountBalanceSnapshot.bankAccountId,
				date: accountBalanceSnapshot.date,
				balance: accountBalanceSnapshot.balance,
			})
			.from(accountBalanceSnapshot)
			.where(
				and(
					eq(accountBalanceSnapshot.userId, userId),
					inArray(accountBalanceSnapshot.bankAccountId, accountIds),
					lte(accountBalanceSnapshot.date, end),
				),
			)
			.orderBy(asc(accountBalanceSnapshot.date));
		for (const row of rows) {
			const list = byAccount.get(row.bankAccountId) ?? [];
			list.push({ date: row.date, balance: row.balance });
			byAccount.set(row.bankAccountId, list);
		}
		return byAccount;
	}
}

/**
 * The range starts at the last snapshot on or before its first day, else the earliest one
 * inside it; an account with no history has not moved.
 */
function toInvestmentAccount(account: BankAccountDto, series: Snapshot[]) {
	const start = series[0]?.balance ?? account.currentBalance;
	return {
		...account,
		change: account.currentBalance - start,
		sparkline: series.map((point) => ({ date: point.date, value: point.balance })),
	};
}
