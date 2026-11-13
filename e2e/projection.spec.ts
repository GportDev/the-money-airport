import { expect, test } from "@playwright/test";
import { debtOrder } from "../server/src/debt/debt-order";
import { planItemsFor, project } from "../server/src/forecast/projection";

// CONVENTION-DEVIATION: the projection engine is pure, so these specs call it directly with fixed
// fixtures instead of going through the UI (docs/07_IMPLEMENTATION_GUIDE.md asks for unit tests).

const BASE = {
	today: "2027-01-15",
	through: "2027-02-28",
	openingCash: 100_000,
	safetyBuffer: 15_000,
	cards: [],
	savings: [],
};

function item(
	input: Partial<Parameters<typeof project>[0]["items"][number]> & { date: string; amount: number },
) {
	return {
		kind: "fixed" as const,
		sourceId: "row",
		name: "Item",
		cardId: null,
		savingsAccountId: null,
		...input,
	};
}

test("cash moves by each item on its day and starts the day after today", () => {
	const result = project({
		...BASE,
		items: [
			item({ kind: "revenue", date: "2027-01-20", amount: 300_000 }),
			item({ date: "2027-01-25", amount: -50_000 }),
		],
	});
	expect(result.days[0]?.date).toBe("2027-01-16");
	expect(result.days.find((day) => day.date === "2027-01-20")?.cash).toBe(400_000);
	expect(result.days.find((day) => day.date === "2027-01-25")?.cash).toBe(350_000);
	expect(result.days.at(-1)?.date).toBe("2027-02-28");
});

test("spending paid from a card grows the card and leaves Operating cash alone", () => {
	const result = project({
		...BASE,
		cards: [{ id: "card", balance: 20_000 }],
		items: [item({ kind: "variable", date: "2027-01-20", amount: -7_500, cardId: "card" })],
	});
	expect(result.days.at(-1)?.cash).toBe(100_000);
	expect(result.monthEnds.find((end) => end.month === "2027-01")?.cards).toBe(27_500);
});

test("savings deposits move cash into savings, which compounds monthly at its APY", () => {
	const result = project({
		...BASE,
		savings: [{ id: "savings", balance: 120_000, apyBps: 1_200 }],
		items: [
			item({ kind: "savings", date: "2027-02-01", amount: -10_000, savingsAccountId: "savings" }),
		],
	});
	const january = result.monthEnds.find((end) => end.month === "2027-01");
	const february = result.monthEnds.find((end) => end.month === "2027-02");
	expect(january?.savings).toBe(121_200);
	expect(february?.savings).toBe(131_200 + 1_312);
	expect(february?.cash).toBe(90_000);
});

test("each run of days below the Safety buffer reports its lowest day", () => {
	const result = project({
		...BASE,
		openingCash: 20_000,
		items: [
			item({ date: "2027-01-20", amount: -10_000 }),
			item({ date: "2027-01-21", amount: -2_000 }),
			item({ kind: "revenue", date: "2027-01-25", amount: 50_000 }),
			item({ date: "2027-02-10", amount: -60_000 }),
		],
	});
	expect(result.shortfalls).toEqual([
		{ date: "2027-01-21", short: 7_000 },
		{ date: "2027-02-10", short: 17_000 },
	]);
});

test("plan rows land on their day, clamped to the month, with section defaults", () => {
	const amounts = new Map([
		["2027-01", 10_000],
		["2027-02", 10_000],
	]);
	const items = planItemsFor(
		[
			{
				id: "rent",
				name: "Rent",
				sectionType: "fixed_expense",
				dayOfMonth: 31,
				cardId: null,
				savingsAccountId: null,
				amounts,
			},
			{
				id: "salary",
				name: "Salary",
				sectionType: "revenue",
				dayOfMonth: null,
				cardId: null,
				savingsAccountId: null,
				amounts,
			},
			{
				id: "food",
				name: "Food",
				sectionType: "variable_expense",
				dayOfMonth: null,
				cardId: null,
				savingsAccountId: null,
				amounts,
			},
		],
		"2027-01-15",
		"2027-02-28",
	);
	expect(items.map((entry) => [entry.sourceId, entry.date, entry.amount])).toEqual([
		["rent", "2027-01-31", -10_000],
		["food", "2027-01-31", -10_000],
		["salary", "2027-02-01", 10_000],
		["rent", "2027-02-28", -10_000],
		["food", "2027-02-28", -10_000],
	]);
});

const CARD_TERMS = {
	id: "card",
	aprBps: 2_400,
	closeDay: 10,
	dueDay: 5,
	fixedPayment: null,
	inDebtPlan: true,
};

test("a card pays its Statement on the due day, then each new Statement after close", () => {
	const result = project({
		...BASE,
		openingCash: 500_000,
		through: "2027-03-31",
		cards: [
			{
				...CARD_TERMS,
				balance: 50_000,
				rule: "statement_balance",
				latestStatement: {
					periodEnd: "2027-01-10",
					balance: 30_000,
					minimum: 2_500,
					dueDate: "2027-02-05",
				},
				currentPeriodSpend: 20_000,
			},
		],
		items: [],
	});
	const paymentOn = (date: string) =>
		result.days
			.find((day) => day.date === date)
			?.items.find((entry) => entry.kind === "card_payment");
	expect(paymentOn("2027-02-05")?.amount).toBe(-30_000);
	expect(paymentOn("2027-03-05")?.amount).toBe(-20_000);
	expect(result.monthEnds.find((end) => end.month === "2027-03")?.cards).toBe(0);
});

test("a card on the minimum rule carries a balance that adds Projected interest at close", () => {
	const result = project({
		...BASE,
		openingCash: 500_000,
		through: "2027-03-31",
		cards: [
			{
				...CARD_TERMS,
				balance: 30_000,
				rule: "minimum",
				latestStatement: {
					periodEnd: "2027-01-10",
					balance: 30_000,
					minimum: 2_500,
					dueDate: "2027-02-05",
				},
				currentPeriodSpend: 0,
			},
		],
		items: [],
	});
	const february = result.liabilityMonths.find(
		(entry) => entry.month === "2027-02" && entry.id === "card",
	);
	expect(february).toMatchObject({ balance: 28_050, scheduled: 2_500, interest: 550 });
	const march = result.days.find((day) => day.date === "2027-03-05");
	expect(march?.items.find((entry) => entry.kind === "card_payment")?.amount).toBe(-2_500);
});

test("a card with no due day has no scheduled payment", () => {
	const result = project({
		...BASE,
		cards: [{ id: "card", balance: 20_000 }],
		items: [],
	});
	expect(result.days.flatMap((day) => day.items)).toEqual([]);
});

test("loan payments follow the schedule: interest first, then principal", () => {
	const result = project({
		...BASE,
		openingCash: 500_000,
		through: "2027-02-28",
		loans: [
			{
				id: "loan",
				balance: 100_000,
				aprBps: 1_200,
				paymentDay: 20,
				payment: 10_000,
				extra: 0,
				inDebtPlan: true,
			},
		],
		items: [],
	});
	const balanceIn = (month: string) =>
		result.liabilityMonths.find((entry) => entry.month === month && entry.id === "loan")?.balance;
	expect(balanceIn("2027-01")).toBe(91_000);
	expect(balanceIn("2027-02")).toBe(81_910);
	expect(result.monthEnds.find((end) => end.month === "2027-02")?.cash).toBe(480_000);
});

test("Payback takes cash down to the buffer until the next income, spilling over in plan order", () => {
	const result = project({
		...BASE,
		openingCash: 200_000,
		paybackDay: null,
		debtOrder: ["card", "loan"],
		cards: [{ id: "card", balance: 100_000, aprBps: 2_900, inDebtPlan: true }],
		loans: [
			{
				id: "loan",
				balance: 80_000,
				aprBps: null,
				paymentDay: null,
				payment: null,
				extra: 0,
				inDebtPlan: true,
			},
		],
		items: [
			item({ date: "2027-01-31", amount: -50_000 }),
			item({ kind: "revenue", date: "2027-02-01", amount: 300_000 }),
		],
	});
	const paybackOn = (date: string) =>
		result.days.find((day) => day.date === date)?.items.find((entry) => entry.kind === "payback");
	expect(paybackOn("2027-01-31")).toMatchObject({
		amount: -135_000,
		split: [
			{ id: "card", amount: 100_000 },
			{ id: "loan", amount: 35_000 },
		],
	});
	expect(result.days.find((day) => day.date === "2027-01-31")?.cash).toBe(15_000);
	expect(paybackOn("2027-02-28")).toMatchObject({ amount: -45_000 });
	expect(result.monthEnds.find((end) => end.month === "2027-02")?.loans).toBe(0);
});

test("Payback leaves room for a bill that lands before the next income", () => {
	const result = project({
		...BASE,
		through: "2027-02-10",
		paybackDay: null,
		debtOrder: ["card"],
		cards: [{ id: "card", balance: 50_000, aprBps: 2_900, inDebtPlan: true }],
		items: [
			item({ date: "2027-02-03", amount: -60_000 }),
			item({ kind: "revenue", date: "2027-02-05", amount: 300_000 }),
		],
	});
	const payback = result.days
		.find((day) => day.date === "2027-01-31")
		?.items.find((entry) => entry.kind === "payback");
	expect(payback?.amount).toBe(-25_000);
	expect(result.days.find((day) => day.date === "2027-02-03")?.cash).toBe(15_000);
	expect(result.shortfalls).toEqual([]);
});

test("Debt plan order: avalanche by APR, snowball by balance, custom by priority", () => {
	const liabilities = [
		{ id: "a", balance: 100_000, aprBps: 2_900, priority: 2 },
		{ id: "b", balance: 50_000, aprBps: 1_500, priority: 1 },
		{ id: "c", balance: 70_000, aprBps: null, priority: null },
	];
	expect(debtOrder(liabilities, "avalanche")).toEqual(["a", "b", "c"]);
	expect(debtOrder(liabilities, "snowball")).toEqual(["b", "c", "a"]);
	expect(debtOrder(liabilities, "custom")).toEqual(["b", "a", "c"]);
});
