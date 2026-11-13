import { expect, test } from "@playwright/test";
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
