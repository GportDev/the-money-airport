import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccountsService } from "../accounts/accounts.service";
import type { BankAccountDto } from "../accounts/accounts.types";
import { DATABASE } from "../db/db.module";
import { bankAccount } from "../db/schema/bank-account";
import { addMonths } from "../debt/months";
import { SettingsService } from "../settings/settings.service";
import { monthEndOf, monthKey, todayIso } from "./dates";
import type { DebtLiability, DebtPlan, ForecastDebtSection } from "./forecast.types";
import type { LiabilityMonth } from "./projection";
import { type PlanRun, ProjectionService } from "./projection.service";

export const DEFAULT_DEBT_MONTHS = 24;
const INTEREST_WINDOW_MONTHS = 12;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const LIABILITY_GROUPS = ["credit", "loan"];

/** The Debt tab and the Year Debt section, both read from the one projection run. */
@Injectable()
export class DebtPlanService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly projection: ProjectionService,
		private readonly accounts: AccountsService,
		private readonly settings: SettingsService,
	) {}

	async plan(userId: string, months = DEFAULT_DEBT_MONTHS): Promise<DebtPlan> {
		const run = await this.projection.run(userId, horizonEnd(months));
		const accounts = new Map((await this.accounts.list(userId)).map((dto) => [dto.id, dto]));
		const totalDebt = run.liabilities.reduce((sum, entry) => sum + entry.balance, 0);
		const liabilities = run.debtOrder.flatMap((id) => {
			const account = accounts.get(id);
			return account ? [debtLiability(run, account, totalDebt)] : [];
		});
		const payoffs = liabilities.map((entry) => entry.payoffMonth);
		return {
			baseCurrency: run.baseCurrency,
			strategy: run.strategy,
			safetyBuffer: run.safetyBuffer,
			paybackDay: run.paybackDay,
			totalDebt,
			debtFreeMonth:
				payoffs.length > 0 && payoffs.every((month) => month !== null)
					? (payoffs.sort().at(-1) ?? null)
					: null,
			projectedInterest12m: interestWithin(run, INTEREST_WINDOW_MONTHS),
			utilization: utilizationOf([...accounts.values()]),
			liabilities,
			notInPlan: run.liabilities
				.filter((entry) => !entry.inDebtPlan)
				.flatMap((entry) => {
					const account = accounts.get(entry.account.id);
					return account ? [{ account }] : [];
				}),
			series: seriesOf(run),
		};
	}

	/** Liability id → payoff month, for pay-down Goals. */
	async payoffMonths(userId: string) {
		const plan = await this.plan(userId);
		return new Map(plan.liabilities.map((entry) => [entry.account.id, entry.payoffMonth]));
	}

	/** Saves a drag order as `debt_priority` and switches the strategy to custom. */
	async order(userId: string, bankAccountIds: string[]) {
		const owned = await this.db
			.select({ id: bankAccount.id })
			.from(bankAccount)
			.where(
				and(
					eq(bankAccount.userId, userId),
					inArray(bankAccount.id, bankAccountIds),
					inArray(bankAccount.displayGroup, LIABILITY_GROUPS),
				),
			);
		if (owned.length !== new Set(bankAccountIds).size) {
			throw new NotFoundException("Liability not found");
		}
		await this.db.transaction(async (tx) => {
			for (const [index, id] of bankAccountIds.entries()) {
				await tx
					.update(bankAccount)
					.set({ debtPriority: index, updatedAt: new Date() })
					.where(and(eq(bankAccount.id, id), eq(bankAccount.userId, userId)));
			}
		});
		await this.settings.update(userId, { debtStrategy: "custom" });
		return this.plan(userId);
	}

	async section(userId: string, year: number): Promise<ForecastDebtSection> {
		const run = await this.projection.run(userId, monthEndOf(year, 12));
		const rows = run.liabilities.map((entry) => {
			const cells: ForecastDebtSection["rows"][number]["cells"] = {};
			for (const month of MONTHS) {
				const tally = monthOf(
					run.projection.liabilityMonths,
					entry.account.id,
					monthKey(year, month),
				);
				cells[month] = {
					scheduled: tally?.scheduled ?? 0,
					payback: tally?.payback ?? 0,
					actual: null,
				};
			}
			return {
				bankAccountId: entry.account.id,
				name: entry.account.name,
				kind: entry.kind === "card" ? ("card_payment" as const) : ("loan_payment" as const),
				cells,
			};
		});
		const totals: Record<number, number> = {};
		for (const month of MONTHS) {
			totals[month] = rows.reduce(
				(sum, row) => sum + (row.cells[month]?.scheduled ?? 0) + (row.cells[month]?.payback ?? 0),
				0,
			);
		}
		return { type: "debt", rows, totals };
	}
}

/** The last day of the month `months − 1` months from now. */
function horizonEnd(months: number) {
	const last = addMonths(`${todayIso().slice(0, 7)}-01`, months - 1);
	return monthEndOf(Number(last.slice(0, 4)), Number(last.slice(5, 7)));
}

function monthOf(rows: LiabilityMonth[], id: string, month: string) {
	return rows.find((entry) => entry.id === id && entry.month === month);
}

function debtLiability(run: PlanRun, account: BankAccountDto, totalDebt: number): DebtLiability {
	const balance = run.liabilities.find((entry) => entry.account.id === account.id)?.balance ?? 0;
	const rows = run.projection.liabilityMonths.filter((entry) => entry.id === account.id);
	const thisMonth = rows.find((entry) => entry.month === run.today.slice(0, 7));
	const nextMonth = rows.find((entry) => entry.month > run.today.slice(0, 7));
	return {
		account,
		share: totalDebt > 0 ? balance / totalDebt : 0,
		scheduledPayment: thisMonth?.scheduled ?? 0,
		payback: thisMonth?.payback ?? 0,
		projectedInterest: nextMonth?.interest ?? thisMonth?.interest ?? 0,
		payoffMonth:
			balance <= 0
				? run.today.slice(0, 7)
				: (rows.find((entry) => entry.balance <= 0)?.month ?? null),
	};
}

function interestWithin(run: PlanRun, months: number) {
	const months12 = [...new Set(run.projection.liabilityMonths.map((entry) => entry.month))]
		.sort()
		.slice(0, months);
	return run.projection.liabilityMonths
		.filter((entry) => months12.includes(entry.month))
		.reduce((sum, entry) => sum + entry.interest, 0);
}

/** Sum of card balances over sum of limits, for cards with a limit. */
function utilizationOf(accounts: BankAccountDto[]) {
	const cards = accounts.filter(
		(account) => account.displayGroup === "credit" && !account.isHidden && account.creditLimit,
	);
	const limit = cards.reduce((sum, card) => sum + (card.creditLimit ?? 0), 0);
	return limit > 0 ? cards.reduce((sum, card) => sum + card.currentBalance, 0) / limit : null;
}

function seriesOf(run: PlanRun): DebtPlan["series"] {
	const inPlan = new Set(run.debtOrder);
	const byMonth = new Map<string, DebtPlan["series"][number]>();
	for (const entry of run.projection.liabilityMonths) {
		const point = byMonth.get(entry.month) ?? { month: entry.month, balances: {}, payback: 0 };
		point.payback += entry.payback;
		if (inPlan.has(entry.id)) point.balances[entry.id] = entry.balance;
		byMonth.set(entry.month, point);
	}
	return [...byMonth.values()];
}
