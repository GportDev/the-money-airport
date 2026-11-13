import { addMonths } from "./months";

/** Extra-payment scenarios for the Loan payoff drawer, in cents (PRD F12.24). */
export const EXTRA_SCENARIOS = [0, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000];

/** Guards against a payment that never covers the interest. */
const MAX_PERIODS = 1_200;

export type AmortizationRow = {
	period: number;
	date: string;
	beginningBalance: number;
	payment: number;
	interest: number;
	principal: number;
	extra: number;
	endingBalance: number;
};

export type Scenario = {
	extra: number;
	payment: number;
	payoffMonths: number;
	monthsSaved: number;
	totalInterest: number;
	interestSaved: number;
};

export type Amortization = {
	basePayment: number;
	baseTotalInterest: number;
	basePayoffDate: string;
	scenarios: Scenario[];
	schedule: AmortizationRow[];
};

/** Interest for one month at an APR in basis points. */
export function monthlyInterest(balance: number, aprBps: number | null) {
	return aprBps ? Math.round((balance * aprBps) / 120_000) : 0;
}

/** round(P · r / (1 − (1 + r)^−n)) with r = APR / 12; a 0% loan pays P / n. */
export function scheduledPayment(principal: number, aprBps: number, termMonths: number) {
	const rate = aprBps / 10_000 / 12;
	if (rate === 0) {
		return Math.round(principal / termMonths);
	}
	return Math.round((principal * rate) / (1 - (1 + rate) ** -termMonths));
}

/** Month-by-month split of each payment into interest and principal until the balance is 0. */
export function schedule(input: {
	balance: number;
	aprBps: number | null;
	payment: number;
	extra: number;
	firstDate: string;
}): AmortizationRow[] {
	const rows: AmortizationRow[] = [];
	let balance = input.balance;
	for (let period = 1; balance > 0 && period <= MAX_PERIODS; period += 1) {
		const interest = monthlyInterest(balance, input.aprBps);
		const due = balance + interest;
		const payment = Math.min(due, input.payment);
		const extra = Math.min(due - payment, input.extra);
		const endingBalance = due - payment - extra;
		rows.push({
			period,
			date: addMonths(input.firstDate, period - 1),
			beginningBalance: balance,
			payment,
			interest,
			principal: payment - interest,
			extra,
			endingBalance,
		});
		if (endingBalance >= balance) break;
		balance = endingBalance;
	}
	return rows;
}

function totalInterest(rows: AmortizationRow[]) {
	return rows.reduce((sum, row) => sum + row.interest, 0);
}

/** The payoff picture for a loan: base plan, compare cards, and the schedule for `extra`. */
export function amortization(input: {
	balance: number;
	aprBps: number | null;
	payment: number;
	extra: number;
	firstDate: string;
}): Amortization {
	const base = schedule({ ...input, extra: 0 });
	const baseInterest = totalInterest(base);
	const extras = EXTRA_SCENARIOS.includes(input.extra)
		? EXTRA_SCENARIOS
		: [...EXTRA_SCENARIOS, input.extra].sort((a, b) => a - b);
	const scenarios = extras.map((extra) => {
		const rows = extra === 0 ? base : schedule({ ...input, extra });
		const interest = totalInterest(rows);
		return {
			extra,
			payment: input.payment + extra,
			payoffMonths: rows.length,
			monthsSaved: base.length - rows.length,
			totalInterest: interest,
			interestSaved: baseInterest - interest,
		};
	});
	return {
		basePayment: input.payment,
		baseTotalInterest: baseInterest,
		basePayoffDate: base.at(-1)?.date ?? input.firstDate,
		scenarios,
		schedule: input.extra === 0 ? base : schedule(input),
	};
}
