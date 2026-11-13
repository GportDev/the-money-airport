import { addDays, isMonthEnd, lastDayOf, monthsBetween } from "./dates";

export type SectionType = "revenue" | "savings" | "fixed_expense" | "variable_expense";

export type PlanItemKind = "revenue" | "fixed" | "variable" | "savings" | "one_off";

export type PlanItem = {
	kind: PlanItemKind;
	sourceId: string;
	name: string;
	date: string;
	/** Base cents, signed from Operating cash's side: + inflow, − outflow. */
	amount: number;
	/** Set when a credit BankAccount pays the item: the card balance moves, not cash. */
	cardId: string | null;
	/** The savings BankAccount the Money lands in or leaves, e.g. a Fund's host. */
	savingsAccountId: string | null;
};

export type PlanRow = {
	id: string;
	name: string;
	sectionType: SectionType;
	dayOfMonth: number | null;
	cardId: string | null;
	savingsAccountId: string | null;
	/** `YYYY-MM` → Plan amount in Base cents, unsigned. */
	amounts: Map<string, number>;
};

export type ProjectionInput = {
	/** The last day already in balances; the projection starts the day after. */
	today: string;
	through: string;
	openingCash: number;
	safetyBuffer: number;
	cards: { id: string; balance: number }[];
	savings: { id: string; balance: number; apyBps: number | null }[];
	items: PlanItem[];
};

export type ProjectedDay = { date: string; cash: number; items: PlanItem[] };
export type MonthEnd = { month: string; cash: number; cards: number; savings: number };
export type Shortfall = { date: string; short: number };
export type Projection = { days: ProjectedDay[]; monthEnds: MonthEnd[]; shortfalls: Shortfall[] };

const KIND_BY_SECTION: Record<SectionType, PlanItemKind> = {
	revenue: "revenue",
	savings: "savings",
	fixed_expense: "fixed",
	variable_expense: "variable",
};

/** Deposits and plan items with no target account still count toward the savings total. */
const UNTRACKED_SAVINGS = "untracked";

/**
 * Expands Plan amounts into dated items after `today`. A row lands on its day of month, clamped
 * to the month's last day; with no day, revenue lands on the 1st and everything else on the last.
 */
export function planItemsFor(rows: PlanRow[], today: string, through: string): PlanItem[] {
	const items: PlanItem[] = [];
	for (const month of monthsBetween(addDays(today, 1), through)) {
		for (const row of rows) {
			const amount = row.amounts.get(month) ?? 0;
			const date = rowDate(row, month);
			if (amount === 0 || date <= today || date > through) {
				continue;
			}
			items.push({
				kind: KIND_BY_SECTION[row.sectionType],
				sourceId: row.id,
				name: row.name,
				date,
				amount: row.sectionType === "revenue" ? Math.abs(amount) : -Math.abs(amount),
				cardId: row.cardId,
				savingsAccountId: row.sectionType === "savings" ? row.savingsAccountId : null,
			});
		}
	}
	return items.sort((a, b) => a.date.localeCompare(b.date));
}

function rowDate(row: PlanRow, month: string) {
	const last = lastDayOf(month);
	const fallback = row.sectionType === "revenue" ? 1 : last;
	const day = Math.min(row.dayOfMonth ?? fallback, last);
	return `${month}-${String(day).padStart(2, "0")}`;
}

/** Runs the plan day by day from the day after `today` through `through`. */
export function project(input: ProjectionInput): Projection {
	const byDate = groupByDate(input.items);
	const cards = new Map(input.cards.map((card) => [card.id, card.balance]));
	const savings = new Map(input.savings.map((account) => [account.id, account.balance]));
	const days: ProjectedDay[] = [];
	const monthEnds: MonthEnd[] = [];
	let cash = input.openingCash;

	for (let date = addDays(input.today, 1); date <= input.through; date = addDays(date, 1)) {
		const items = byDate.get(date) ?? [];
		for (const item of items) {
			cash += applyItem(item, cards, savings);
		}
		days.push({ date, cash, items });
		if (isMonthEnd(date) || date === input.through) {
			compoundSavings(savings, input.savings);
			monthEnds.push({ month: date.slice(0, 7), cash, cards: sum(cards), savings: sum(savings) });
		}
	}
	return { days, monthEnds, shortfalls: shortfallsOf(days, input.safetyBuffer) };
}

/** Moves the item's Money between cash, a card, and savings; returns the change to cash. */
function applyItem(item: PlanItem, cards: Map<string, number>, savings: Map<string, number>) {
	if (item.cardId) {
		cards.set(item.cardId, (cards.get(item.cardId) ?? 0) - item.amount);
		return 0;
	}
	if (item.kind === "savings" || item.savingsAccountId) {
		const target = item.savingsAccountId ?? UNTRACKED_SAVINGS;
		savings.set(target, (savings.get(target) ?? 0) - item.amount);
	}
	return item.amount;
}

function compoundSavings(savings: Map<string, number>, accounts: ProjectionInput["savings"]): void {
	for (const account of accounts) {
		if (!account.apyBps) {
			continue;
		}
		const balance = savings.get(account.id) ?? 0;
		savings.set(account.id, balance + Math.round((balance * account.apyBps) / 120_000));
	}
}

function shortfallsOf(days: ProjectedDay[], buffer: number): Shortfall[] {
	const shortfalls: Shortfall[] = [];
	let lowest: ProjectedDay | null = null;
	for (const day of days) {
		if (day.cash < buffer) {
			lowest = !lowest || day.cash < lowest.cash ? day : lowest;
			continue;
		}
		if (lowest) {
			shortfalls.push({ date: lowest.date, short: buffer - lowest.cash });
			lowest = null;
		}
	}
	if (lowest) {
		shortfalls.push({ date: lowest.date, short: buffer - lowest.cash });
	}
	return shortfalls;
}

function groupByDate(items: PlanItem[]) {
	const byDate = new Map<string, PlanItem[]>();
	for (const item of items) {
		byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
	}
	return byDate;
}

function sum(values: Map<string, number>) {
	let total = 0;
	for (const value of values.values()) {
		total += value;
	}
	return total;
}
