import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, gte, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { isInCashPlan } from "../accounts/accounts.types";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { bankAccount } from "../db/schema/bank-account";
import { forecastCell, forecastOneOff, forecastRow, forecastSection } from "../db/schema/forecast";
import { goal } from "../db/schema/goal";
import { loanTerms } from "../db/schema/loan-terms";
import type { PaymentRule } from "../debt/card-payment";
import { type DebtStrategy, debtOrder } from "../debt/debt-order";
import { FxService } from "../fx/fx.service";
import { latestStatement, loanTermsDto, spendSince } from "../liabilities/liability-details";
import { SettingsService } from "../settings/settings.service";
import { type AccountRole, historyReader, type RoleTotals } from "./balance-history";
import { monthKey, todayIso } from "./dates";
import {
	type CardInput,
	type LoanInput,
	type PlanItem,
	type PlanRow,
	type Projection,
	planItemsFor,
	project,
	type SectionType,
} from "./projection";

type Account = typeof bankAccount.$inferSelect;

type RatedAccount = { account: Account; role: AccountRole; rate: number };

/** A card or loan as the plan sees it, in Base cents. */
export type PlanLiability = {
	account: Account;
	kind: "card" | "loan";
	balance: number;
	inDebtPlan: boolean;
};

export type PlanRun = {
	today: string;
	baseCurrency: string;
	safetyBuffer: number;
	paybackDay: number | null;
	strategy: DebtStrategy;
	/** Today's balances in Base, by role. */
	current: RoleTotals;
	liabilities: PlanLiability[];
	/** In-plan liability ids, Payback order. */
	debtOrder: string[];
	projection: Projection;
	/** Past balances by role, from snapshots. */
	historyOn: (date: string) => RoleTotals | null;
};

/** Loads the User's plan and balances and runs the day-by-day projection (PRD F12.14). */
@Injectable()
export class ProjectionService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly settings: SettingsService,
		private readonly fx: FxService,
	) {}

	async run(userId: string, through: string): Promise<PlanRun> {
		const today = todayIso();
		const settings = await this.settings.get(userId);
		const accounts = await this.ratedAccounts(userId, settings.currency);
		const current = currentTotals(accounts);
		const fundHosts = await this.fundHosts(userId);
		const cards = await this.cards(userId, accounts);
		const loans = await this.loans(userId, accounts);
		const cardIds = new Set(cards.map((card) => card.id));
		const end = through > today ? through : today;
		const items = [
			...planItemsFor(await this.planRows(userId, today, end, cardIds, fundHosts), today, end),
			...(await this.oneOffItems(userId, today, end, cardIds, fundHosts)),
		].sort((a, b) => a.date.localeCompare(b.date));
		const liabilities = liabilitiesOf(accounts);
		const order = orderOf(liabilities, settings.debtStrategy);

		const projection = project({
			today,
			through: end,
			openingCash: current.cash,
			safetyBuffer: settings.safetyBuffer,
			cards,
			loans,
			savings: byRole(accounts, "savings").map((a) => ({
				id: a.account.id,
				balance: baseOf(a),
				apyBps: a.account.apyBps,
			})),
			debtOrder: order,
			paybackDay: settings.paybackDay,
			items,
		});
		const historyOn = historyReader(
			await this.snapshots(userId, today),
			accounts.map((a) => ({ id: a.account.id, role: a.role, rate: a.rate })),
		);
		return {
			today,
			baseCurrency: settings.currency,
			safetyBuffer: settings.safetyBuffer,
			paybackDay: settings.paybackDay,
			strategy: settings.debtStrategy,
			current,
			liabilities,
			debtOrder: order,
			projection,
			historyOn,
		};
	}

	/** Visible BankAccounts with a plan role and a known rate into Base. */
	private async ratedAccounts(userId: string, base: string): Promise<RatedAccount[]> {
		const rows = await this.db.select().from(bankAccount).where(eq(bankAccount.userId, userId));
		const rated: RatedAccount[] = [];
		for (const account of rows) {
			const role = roleOf(account);
			const rate = role ? await this.fx.rateFor(account.isoCurrencyCode, base) : null;
			if (role && rate !== null) rated.push({ account, role, rate });
		}
		return rated;
	}

	/** Card terms and the latest Statement, converted to Base at the latest rate. */
	private async cards(userId: string, accounts: RatedAccount[]): Promise<CardInput[]> {
		const cards: CardInput[] = [];
		for (const rated of byRole(accounts, "card")) {
			const { account, rate } = rated;
			const latest = await latestStatement(this.db, userId, account.id);
			const toBase = (cents: number) => Math.round(cents * rate);
			cards.push({
				id: account.id,
				balance: baseOf(rated),
				aprBps: account.aprBps,
				closeDay: account.statementCloseDay,
				dueDay: account.paymentDueDay,
				// Narrowed on write by the accounts controller's enum.
				rule: account.paymentRule as PaymentRule,
				fixedPayment: account.fixedPayment === null ? null : toBase(account.fixedPayment),
				latestStatement: latest
					? {
							periodEnd: latest.periodEnd,
							balance: toBase(latest.statementBalance),
							minimum: latest.minimumPayment === null ? null : toBase(latest.minimumPayment),
							dueDate: latest.dueDate,
						}
					: null,
				currentPeriodSpend: latest
					? toBase(await spendSince(this.db, userId, account.id, latest.periodEnd))
					: 0,
				inDebtPlan: account.inDebtPlan,
			});
		}
		return cards;
	}

	/** Loans pay on schedule from Operating cash; a loan without terms is balance-only. */
	private async loans(userId: string, accounts: RatedAccount[]): Promise<LoanInput[]> {
		const terms = await this.db.select().from(loanTerms).where(eq(loanTerms.userId, userId));
		return byRole(accounts, "loan").map((rated) => {
			const { account, rate } = rated;
			const row = terms.find((entry) => entry.bankAccountId === account.id);
			const dto = row ? loanTermsDto(row, account) : null;
			const paymentDay =
				dto?.paymentDay ??
				(dto?.firstPaymentDate ? Number(dto.firstPaymentDate.slice(8, 10)) : null);
			return {
				id: account.id,
				balance: baseOf(rated),
				aprBps: account.aprBps,
				paymentDay,
				payment: dto?.scheduledPayment ? Math.round(dto.scheduledPayment * rate) : null,
				extra: Math.round((dto?.extraPayment ?? 0) * rate),
				firstPaymentDate: dto?.firstPaymentDate ?? null,
				inDebtPlan: account.inDebtPlan,
			};
		});
	}

	private async planRows(
		userId: string,
		today: string,
		through: string,
		cardIds: Set<string>,
		fundHosts: Map<string, string>,
	): Promise<PlanRow[]> {
		const rows = await this.db
			.select({ row: forecastRow, type: forecastSection.type })
			.from(forecastRow)
			.innerJoin(forecastSection, eq(forecastRow.sectionId, forecastSection.id))
			.where(eq(forecastRow.userId, userId));
		const cells = await this.db
			.select({
				rowId: forecastCell.forecastRowId,
				year: forecastCell.year,
				month: forecastCell.month,
				amount: forecastCell.amount,
			})
			.from(forecastCell)
			.innerJoin(forecastRow, eq(forecastCell.forecastRowId, forecastRow.id))
			.where(
				and(
					eq(forecastRow.userId, userId),
					gte(forecastCell.year, Number(today.slice(0, 4))),
					lte(forecastCell.year, Number(through.slice(0, 4))),
				),
			);
		const amounts = new Map<string, Map<string, number>>();
		for (const cell of cells) {
			const byMonth = amounts.get(cell.rowId) ?? new Map<string, number>();
			byMonth.set(monthKey(cell.year, cell.month), cell.amount);
			amounts.set(cell.rowId, byMonth);
		}
		return rows.map(({ row, type }) => ({
			id: row.id,
			name: row.name,
			// Narrowed on write by the controller's enum.
			sectionType: type as SectionType,
			dayOfMonth: row.dayOfMonth,
			cardId: row.bankAccountId && cardIds.has(row.bankAccountId) ? row.bankAccountId : null,
			savingsAccountId: row.goalId ? (fundHosts.get(row.goalId) ?? null) : null,
			amounts: amounts.get(row.id) ?? new Map(),
		}));
	}

	/** Only expected One-offs project; done ones are already in balances. */
	private async oneOffItems(
		userId: string,
		today: string,
		through: string,
		cardIds: Set<string>,
		fundHosts: Map<string, string>,
	): Promise<PlanItem[]> {
		const rows = await this.db
			.select()
			.from(forecastOneOff)
			.where(
				and(
					eq(forecastOneOff.userId, userId),
					eq(forecastOneOff.status, "expected"),
					gt(forecastOneOff.date, today),
					lte(forecastOneOff.date, through),
				),
			);
		return rows.map((row) => ({
			kind: "one_off",
			sourceId: row.id,
			name: row.name,
			date: row.date,
			amount: row.amount,
			cardId: row.bankAccountId && cardIds.has(row.bankAccountId) ? row.bankAccountId : null,
			savingsAccountId: row.goalId ? (fundHosts.get(row.goalId) ?? null) : null,
		}));
	}

	/** Fund id → host BankAccount id. */
	private async fundHosts(userId: string) {
		const rows = await this.db
			.select({ id: goal.id, hostId: goal.hostBankAccountId })
			.from(goal)
			.where(and(eq(goal.userId, userId), eq(goal.funding, "fund")));
		return new Map(rows.flatMap((row) => (row.hostId ? [[row.id, row.hostId] as const] : [])));
	}

	private snapshots(userId: string, through: string) {
		return this.db
			.select({
				bankAccountId: accountBalanceSnapshot.bankAccountId,
				date: accountBalanceSnapshot.date,
				balance: accountBalanceSnapshot.balance,
			})
			.from(accountBalanceSnapshot)
			.where(
				and(eq(accountBalanceSnapshot.userId, userId), lte(accountBalanceSnapshot.date, through)),
			);
	}
}

/** Operating cash, cards, and loans drive the plan; other cash accounts are savings. */
function roleOf(account: Account): AccountRole | null {
	if (account.isHidden) return null;
	if (isInCashPlan(account)) return "cash";
	if (account.displayGroup === "credit") return "card";
	if (account.displayGroup === "loan") return "loan";
	if (account.displayGroup === "cash") return "savings";
	return null;
}

function baseOf(rated: RatedAccount) {
	return Math.round(rated.account.currentBalance * rated.rate);
}

function byRole(accounts: RatedAccount[], role: AccountRole) {
	return accounts.filter((rated) => rated.role === role);
}

function liabilitiesOf(accounts: RatedAccount[]): PlanLiability[] {
	return accounts.flatMap((rated) =>
		rated.role === "card" || rated.role === "loan"
			? [
					{
						account: rated.account,
						kind: rated.role,
						balance: baseOf(rated),
						inDebtPlan: rated.account.inDebtPlan,
					},
				]
			: [],
	);
}

/** In-plan liability ids in the strategy's Payback order. */
function orderOf(liabilities: PlanLiability[], strategy: DebtStrategy) {
	return debtOrder(
		liabilities
			.filter((liability) => liability.inDebtPlan)
			.map((liability) => ({
				id: liability.account.id,
				balance: liability.balance,
				aprBps: liability.account.aprBps,
				priority: liability.account.debtPriority,
			})),
		strategy,
	);
}

function currentTotals(accounts: RatedAccount[]): RoleTotals {
	const totals: RoleTotals = { cash: 0, card: 0, savings: 0, loan: 0 };
	for (const rated of accounts) {
		totals[rated.role] += baseOf(rated);
	}
	return totals;
}
