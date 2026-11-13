import { Injectable } from "@nestjs/common";
import type { RoleTotals } from "./balance-history";
import { addDays, monthEndOf, monthKey, monthStartOf } from "./dates";
import type {
	ForecastMonth,
	ForecastMonthItem,
	ForecastSectionFull,
	ForecastSummary,
} from "./forecast.types";
import { ForecastYearService } from "./forecast-year.service";
import type { SectionType } from "./projection";
import { type PlanRun, ProjectionService } from "./projection.service";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

type Balances = { cash: number; cards: number; savings: number; loans: number };

/** Year summary and Month detail, both read from one projection run so the numbers agree. */
@Injectable()
export class ForecastViewsService {
	constructor(
		private readonly projection: ProjectionService,
		private readonly year: ForecastYearService,
	) {}

	async summary(userId: string, year: number): Promise<ForecastSummary> {
		const run = await this.projection.run(userId, monthEndOf(year, 12));
		const plan = planTotals(await this.year.sectionsFor(userId, year));
		const summary: ForecastSummary = {
			baseCurrency: run.baseCurrency,
			safetyBuffer: run.safetyBuffer,
			cashFlow: {},
			operatingCash: {},
			lowPoint: {},
			shortfalls: run.projection.shortfalls.filter((entry) => entry.date.startsWith(`${year}-`)),
			creditCardTotal: {},
			savingsTotal: {},
			fixedExpensesTotal: {},
			variableExpensesTotal: {},
			debtPaymentsTotal: {},
			paybackTotal: {},
			debtTotal: {},
			projectedBalanceSeries: [],
		};
		for (const month of MONTHS) {
			summary.cashFlow[month] = plan.cashFlow(month);
			summary.fixedExpensesTotal[month] = plan.total("fixed_expense", month);
			summary.variableExpensesTotal[month] = plan.total("variable_expense", month);
			summary.debtPaymentsTotal[month] = 0;
			summary.paybackTotal[month] = 0;
			const low = lowPointIn(run, monthKey(year, month));
			if (low) summary.lowPoint[month] = low;
			const balances = monthEndBalances(run, year, month);
			if (!balances) continue;
			summary.operatingCash[month] = balances.cash;
			summary.creditCardTotal[month] = balances.cards;
			summary.savingsTotal[month] = balances.savings;
			summary.debtTotal[month] = balances.cards + balances.loans;
			summary.projectedBalanceSeries.push({
				month,
				value: balances.cash,
				projected: monthEndOf(year, month) >= run.today,
			});
		}
		return summary;
	}

	async month(userId: string, year: number, month: number): Promise<ForecastMonth> {
		const start = monthStartOf(year, month);
		const end = monthEndOf(year, month);
		const run = await this.projection.run(userId, end);
		const series: ForecastMonth["series"] = [];
		for (let date = start; date <= end; date = addDays(date, 1)) {
			const value = cashOn(run, date);
			if (value !== null) series.push({ date, value, projected: date > run.today });
		}
		const openingBalance = cashOn(run, addDays(start, -1)) ?? series[0]?.value ?? run.current.cash;
		const lowest = series.reduce<{ date: string; value: number } | null>(
			(low, point) => (!low || point.value < low.value ? point : low),
			null,
		);
		return {
			baseCurrency: run.baseCurrency,
			safetyBuffer: run.safetyBuffer,
			openingBalance,
			closingBalance: series.at(-1)?.value ?? openingBalance,
			series,
			lowPoint: lowest
				? { date: lowest.date, value: lowest.value }
				: { date: start, value: openingBalance },
			shortfalls: run.projection.shortfalls.filter((entry) =>
				entry.date.startsWith(start.slice(0, 7)),
			),
			days: cashDays(run, start.slice(0, 7)),
		};
	}
}

/** Operating cash at the end of a day: snapshots before today, live today, projected after. */
function cashOn(run: PlanRun, date: string) {
	if (date < run.today) return run.historyOn(date)?.cash ?? null;
	if (date === run.today) return run.current.cash;
	return run.projection.days.find((day) => day.date === date)?.cash ?? null;
}

function monthEndBalances(run: PlanRun, year: number, month: number): Balances | null {
	const end = monthEndOf(year, month);
	if (end < run.today) return fromRoles(run.historyOn(end));
	const projected = run.projection.monthEnds.find((entry) => entry.month === monthKey(year, month));
	if (projected) {
		return { ...projected, loans: run.current.loan };
	}
	return end === run.today ? fromRoles(run.current) : null;
}

function fromRoles(totals: RoleTotals | null): Balances | null {
	return totals
		? { cash: totals.cash, cards: totals.card, savings: totals.savings, loans: totals.loan }
		: null;
}

function lowPointIn(run: PlanRun, month: string) {
	let low: { date: string; value: number } | null = null;
	for (const day of run.projection.days) {
		if (day.date.startsWith(month) && (!low || day.cash < low.value)) {
			low = { date: day.date, value: day.cash };
		}
	}
	return low;
}

/** Projected days in the month with Money in or out of Operating cash; card spend is left out. */
function cashDays(run: PlanRun, month: string): ForecastMonth["days"] {
	const days: ForecastMonth["days"] = [];
	for (const day of run.projection.days) {
		if (!day.date.startsWith(month)) continue;
		const items: ForecastMonthItem[] = day.items
			.filter((item) => !item.cardId)
			.map((item) => ({
				kind: item.kind,
				name: item.name,
				amount: item.amount,
				sourceId: item.sourceId,
			}));
		if (items.length === 0) continue;
		const net = items.reduce((sum, item) => sum + item.amount, 0);
		days.push({ date: day.date, net, balanceAfter: day.cash, items });
	}
	return days;
}

/** Plan totals per section type and month, One-offs that are not cancelled included. */
function planTotals(sections: ForecastSectionFull[]) {
	function total(type: SectionType, month: number) {
		let sum = 0;
		for (const section of sections.filter((entry) => entry.type === type)) {
			sum += section.totals[month] ?? 0;
			for (const oneOff of section.oneOffs) {
				const isInMonth = Number(oneOff.date.slice(5, 7)) === month;
				if (!isInMonth || oneOff.status === "cancelled") continue;
				sum += type === "revenue" ? oneOff.amount : -oneOff.amount;
			}
		}
		return sum;
	}
	return {
		total,
		cashFlow: (month: number) =>
			total("revenue", month) -
			total("savings", month) -
			total("fixed_expense", month) -
			total("variable_expense", month),
	};
}
