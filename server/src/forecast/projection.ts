import { monthlyInterest } from "../debt/amortization";
import { cardPayment, type PaymentRule, projectedMinimum } from "../debt/card-payment";
import { addDays, isMonthEnd, lastDayOf, monthsBetween } from "./dates";

export type SectionType = "revenue" | "savings" | "fixed_expense" | "variable_expense";

export type PlanItemKind =
	| "revenue"
	| "fixed"
	| "variable"
	| "savings"
	| "one_off"
	| "card_payment"
	| "loan_payment"
	| "payback";

export type PlanItem = {
	kind: PlanItemKind;
	sourceId: string | null;
	name: string;
	date: string;
	/** Base cents, signed from Operating cash's side: + inflow, − outflow. */
	amount: number;
	/** Set when a credit BankAccount pays the item: the card balance moves, not cash. */
	cardId: string | null;
	/** The savings BankAccount the Money lands in or leaves, e.g. a Fund's host. */
	savingsAccountId: string | null;
	/** Payback only: how much each liability took, in Debt plan order. */
	split?: { id: string; amount: number }[];
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

export type CardInput = {
	id: string;
	/** Amount owed, Base cents. */
	balance: number;
	aprBps?: number | null;
	closeDay?: number | null;
	dueDay?: number | null;
	rule?: PaymentRule;
	fixedPayment?: number | null;
	latestStatement?: {
		periodEnd: string;
		balance: number;
		minimum: number | null;
		dueDate: string | null;
	} | null;
	/** Charges since the latest Statement closed. */
	currentPeriodSpend?: number;
	inDebtPlan?: boolean;
};

export type LoanInput = {
	id: string;
	balance: number;
	aprBps: number | null;
	paymentDay: number | null;
	/** Scheduled payment, Base cents; null = balance-only, paid down by Payback alone. */
	payment: number | null;
	extra: number;
	/** No payment lands before the loan's first payment date. */
	firstPaymentDate?: string | null;
	inDebtPlan: boolean;
};

export type ProjectionInput = {
	/** The last day already in balances; the projection starts the day after. */
	today: string;
	through: string;
	openingCash: number;
	safetyBuffer: number;
	cards: CardInput[];
	savings: { id: string; balance: number; apyBps: number | null }[];
	loans?: LoanInput[];
	/** Liability ids in Debt plan order; without it the plan sends no Payback. */
	debtOrder?: string[];
	/** 1-31; null = last day of the month. */
	paybackDay?: number | null;
	items: PlanItem[];
};

export type ProjectedDay = { date: string; cash: number; items: PlanItem[] };
export type MonthEnd = {
	month: string;
	cash: number;
	cards: number;
	savings: number;
	loans: number;
};
export type LiabilityMonth = {
	month: string;
	id: string;
	balance: number;
	scheduled: number;
	payback: number;
	interest: number;
};
export type Shortfall = { date: string; short: number };
export type Projection = {
	days: ProjectedDay[];
	monthEnds: MonthEnd[];
	liabilityMonths: LiabilityMonth[];
	shortfalls: Shortfall[];
};

type PendingStatement = {
	dueDate: string;
	statement: number;
	minimum: number;
	periodSpend: number;
	/** Payback that landed between close and due counts toward the payment. */
	paid: number;
};

type Tally = { scheduled: number; payback: number; interest: number };

type CardState = {
	input: CardInput;
	balance: number;
	closeDay: number | null;
	dueDay: number | null;
	periodSpend: number;
	pending: PendingStatement | null;
	/** Statement balance left unpaid after the due date; it draws interest at the next close. */
	unpaid: number;
	tally: Tally;
};

type LoanState = { input: LoanInput; balance: number; tally: Tally };

type State = {
	cash: number;
	cards: CardState[];
	loans: LoanState[];
	savings: Record<string, number>;
};

const KIND_BY_SECTION: Record<SectionType, PlanItemKind> = {
	revenue: "revenue",
	savings: "savings",
	fixed_expense: "fixed",
	variable_expense: "variable",
};

/** Deposits with no target account still count toward the savings total. */
const UNTRACKED_SAVINGS = "untracked";

/** When only the due day is known, the Statement is assumed to close this many days before. */
const GRACE_PERIOD_DAYS = 25;

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
	const fallback = row.sectionType === "revenue" ? 1 : lastDayOf(month);
	return dayIn(month, row.dayOfMonth ?? fallback);
}

/** `YYYY-MM-DD` for a day of month, clamped to the month's last day. */
function dayIn(month: string, day: number) {
	return `${month}-${String(Math.min(day, lastDayOf(month))).padStart(2, "0")}`;
}

/** Runs the plan day by day from the day after `today` through `through` (PRD F12.14–F12.19). */
export function project(input: ProjectionInput): Projection {
	const byDate = groupByDate(input.items);
	const incomeDates = input.items
		.filter((item) => item.amount > 0 && (item.kind === "revenue" || item.kind === "one_off"))
		.map((item) => item.date);
	const state = initialState(input);
	const days: ProjectedDay[] = [];
	const monthEnds: MonthEnd[] = [];
	const liabilityMonths: LiabilityMonth[] = [];

	for (let date = addDays(input.today, 1); date <= input.through; date = addDays(date, 1)) {
		const planned = byDate.get(date) ?? [];
		const generated = stepDay(state, date, planned);
		if (isPaybackDay(date, input.paybackDay) && input.debtOrder) {
			const payback = paybackOn(state, date, input, byDate, incomeDates);
			if (payback) generated.push(payback);
		}
		days.push({ date, cash: state.cash, items: [...planned, ...generated] });
		if (isMonthEnd(date) || date === input.through) {
			compoundSavings(state, input.savings);
			monthEnds.push(monthEndOf(state, date.slice(0, 7)));
			liabilityMonths.push(...closeTallies(state, date.slice(0, 7)));
		}
	}
	return { days, monthEnds, liabilityMonths, shortfalls: shortfallsOf(days, input.safetyBuffer) };
}

function initialState(input: ProjectionInput): State {
	return {
		cash: input.openingCash,
		cards: input.cards.map((card) => initialCard(card, input.today)),
		loans: (input.loans ?? []).map((loan) => ({
			input: loan,
			balance: loan.balance,
			tally: zero(),
		})),
		savings: Object.fromEntries(input.savings.map((account) => [account.id, account.balance])),
	};
}

function initialCard(card: CardInput, today: string): CardState {
	const latest = card.latestStatement ?? null;
	const dueDay = card.dueDay ?? (latest?.dueDate ? Number(latest.dueDate.slice(8, 10)) : null);
	const closeDay =
		card.closeDay ??
		(latest ? Number(latest.periodEnd.slice(8, 10)) : null) ??
		(dueDay ? Number(addDays(dayIn("2000-01", dueDay), -GRACE_PERIOD_DAYS).slice(8, 10)) : null);
	const isLatestDue = latest?.dueDate && latest.dueDate > today;
	return {
		input: card,
		balance: card.balance,
		closeDay: dueDay ? closeDay : null,
		dueDay,
		periodSpend: card.currentPeriodSpend ?? 0,
		pending:
			latest?.dueDate && isLatestDue
				? {
						dueDate: latest.dueDate,
						statement: latest.balance,
						minimum: latest.minimum ?? projectedMinimum(latest.balance, 0),
						periodSpend: latest.balance,
						paid: 0,
					}
				: null,
		unpaid: 0,
		tally: zero(),
	};
}

/** One day without Payback: plan items, then loan payments, card payments, and card closes. */
function stepDay(state: State, date: string, planned: PlanItem[]): PlanItem[] {
	for (const item of planned) {
		state.cash += applyItem(item, state);
	}
	const generated: PlanItem[] = [];
	for (const loan of state.loans) {
		const payment = loanPayment(loan, date);
		if (payment) generated.push(payment);
	}
	for (const card of state.cards) {
		const payment = cardDue(card, date);
		if (payment) generated.push(payment);
		closeCard(card, date);
	}
	for (const item of generated) {
		state.cash += item.amount;
	}
	return generated;
}

/** Moves the item's Money between cash, a card, and savings; returns the change to cash. */
function applyItem(item: PlanItem, state: State) {
	if (item.cardId) {
		const card = state.cards.find((entry) => entry.input.id === item.cardId);
		if (card) {
			card.balance -= item.amount;
			card.periodSpend -= item.amount;
		}
		return 0;
	}
	if (item.kind === "savings" || item.savingsAccountId) {
		const target = item.savingsAccountId ?? UNTRACKED_SAVINGS;
		state.savings[target] = (state.savings[target] ?? 0) - item.amount;
	}
	return item.amount;
}

function loanPayment(loan: LoanState, date: string): PlanItem | null {
	const { payment, paymentDay, aprBps, extra } = loan.input;
	const isDue = paymentDay !== null && date === dayIn(date.slice(0, 7), paymentDay);
	const hasStarted = !loan.input.firstPaymentDate || date >= loan.input.firstPaymentDate;
	if (payment === null || !isDue || !hasStarted || loan.balance <= 0) return null;
	const interest = monthlyInterest(loan.balance, aprBps);
	const amount = Math.min(loan.balance + interest, payment + extra);
	loan.balance += interest - amount;
	loan.tally.scheduled += amount;
	loan.tally.interest += interest;
	return generatedItem("loan_payment", "Loan payment", loan.input.id, date, -amount);
}

function cardDue(card: CardState, date: string): PlanItem | null {
	const pending = card.pending;
	if (!pending || pending.dueDate !== date) return null;
	const owed = cardPayment({
		rule: card.input.rule ?? "statement_balance",
		statementBalance: pending.statement,
		minimum: pending.minimum,
		periodSpend: pending.periodSpend,
		fixedPayment: card.input.fixedPayment ?? null,
	});
	const amount = Math.max(0, Math.min(owed - pending.paid, card.balance));
	card.balance -= amount;
	card.unpaid = Math.max(0, pending.statement - pending.paid - amount);
	card.pending = null;
	card.tally.scheduled += amount;
	return amount > 0
		? generatedItem("card_payment", "Card payment", card.input.id, date, -amount)
		: null;
}

/** At close: unpaid Statement balance adds Projected interest, then a new Statement is due. */
function closeCard(card: CardState, date: string) {
	if (card.closeDay === null || card.dueDay === null) return;
	if (date !== dayIn(date.slice(0, 7), card.closeDay)) return;
	const interest = monthlyInterest(card.unpaid, card.input.aprBps ?? null);
	card.balance += interest;
	card.tally.interest += interest;
	const statement = Math.max(0, card.balance);
	card.pending = {
		dueDate: nextDueDate(date, card.dueDay),
		statement,
		minimum: projectedMinimum(statement, interest),
		periodSpend: card.periodSpend,
		paid: 0,
	};
	card.periodSpend = 0;
	card.unpaid = 0;
}

/** The first `dueDay` after the close date. */
function nextDueDate(closeDate: string, dueDay: number) {
	const sameMonth = dayIn(closeDate.slice(0, 7), dueDay);
	if (sameMonth > closeDate) return sameMonth;
	return dayIn(addDays(`${closeDate.slice(0, 7)}-01`, 32).slice(0, 7), dueDay);
}

function isPaybackDay(date: string, paybackDay: number | null | undefined) {
	return date === dayIn(date.slice(0, 7), paybackDay ?? lastDayOf(date.slice(0, 7)));
}

/**
 * CONTEXT Payback: the lowest Operating cash from today until the next income, less the Safety
 * buffer, capped at what the in-plan liabilities still owe, paid in Debt plan order.
 */
function paybackOn(
	state: State,
	date: string,
	input: ProjectionInput,
	byDate: Map<string, PlanItem[]>,
	incomeDates: string[],
): PlanItem | null {
	const plan = (input.debtOrder ?? [])
		.map((id) => liabilityById(state, id))
		.filter(
			(liability): liability is PayableLiability =>
				liability?.inDebtPlan === true && liability.balance() > 0,
		);
	const payable = plan.reduce((sum, liability) => sum + liability.balance(), 0);
	if (payable <= 0) return null;
	const nextIncome = incomeDates.find((income) => income > date) ?? addDays(input.through, 1);
	const low = lowestCashBefore(state, date, nextIncome, byDate);
	const amount = Math.min(Math.max(0, low - input.safetyBuffer), payable);
	if (amount <= 0) return null;

	const split: { id: string; amount: number }[] = [];
	let left = amount;
	for (const liability of plan) {
		if (left <= 0) break;
		const take = Math.min(left, liability.balance());
		liability.pay(take);
		split.push({ id: liability.id, amount: take });
		left -= take;
	}
	state.cash -= amount;
	return { ...generatedItem("payback", "Payback", null, date, -amount), split };
}

/** Today's cash and each day after it until (not including) `until`, run on a copy. */
function lowestCashBefore(
	state: State,
	date: string,
	until: string,
	byDate: Map<string, PlanItem[]>,
) {
	const copy = structuredClone(state);
	let low = state.cash;
	for (let day = addDays(date, 1); day < until; day = addDays(day, 1)) {
		stepDay(copy, day, byDate.get(day) ?? []);
		low = Math.min(low, copy.cash);
	}
	return low;
}

type PayableLiability = {
	id: string;
	inDebtPlan: boolean;
	balance: () => number;
	pay: (amount: number) => void;
};

function liabilityById(state: State, id: string): PayableLiability | null {
	const card = state.cards.find((entry) => entry.input.id === id);
	if (card) {
		return {
			id,
			inDebtPlan: card.input.inDebtPlan ?? true,
			balance: () => card.balance,
			pay: (amount) => {
				card.balance -= amount;
				card.tally.payback += amount;
				if (card.pending) card.pending.paid += amount;
				else card.unpaid = Math.max(0, card.unpaid - amount);
			},
		};
	}
	const loan = state.loans.find((entry) => entry.input.id === id);
	if (!loan) return null;
	return {
		id,
		inDebtPlan: loan.input.inDebtPlan,
		balance: () => loan.balance,
		pay: (amount) => {
			loan.balance -= amount;
			loan.tally.payback += amount;
		},
	};
}

function generatedItem(
	kind: PlanItemKind,
	name: string,
	sourceId: string | null,
	date: string,
	amount: number,
): PlanItem {
	return { kind, name, sourceId, date, amount, cardId: null, savingsAccountId: null };
}

function compoundSavings(state: State, accounts: ProjectionInput["savings"]) {
	for (const account of accounts) {
		if (!account.apyBps) continue;
		const balance = state.savings[account.id] ?? 0;
		state.savings[account.id] = balance + Math.round((balance * account.apyBps) / 120_000);
	}
}

function monthEndOf(state: State, month: string): MonthEnd {
	return {
		month,
		cash: state.cash,
		cards: state.cards.reduce((sum, card) => sum + card.balance, 0),
		savings: Object.values(state.savings).reduce((sum, value) => sum + value, 0),
		loans: state.loans.reduce((sum, loan) => sum + loan.balance, 0),
	};
}

function closeTallies(state: State, month: string): LiabilityMonth[] {
	const rows = [
		...state.cards.map((card) => ({ id: card.input.id, balance: card.balance, tally: card.tally })),
		...state.loans.map((loan) => ({ id: loan.input.id, balance: loan.balance, tally: loan.tally })),
	].map((entry) => ({ month, id: entry.id, balance: entry.balance, ...entry.tally }));
	for (const card of state.cards) card.tally = zero();
	for (const loan of state.loans) loan.tally = zero();
	return rows;
}

function zero(): Tally {
	return { scheduled: 0, payback: 0, interest: 0 };
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
