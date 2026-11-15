import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type SectionType = "revenue" | "savings" | "fixed_expense" | "variable_expense";
type Row = {
	id: string;
	name: string;
	dayOfMonth: number | null;
	categoryId: string | null;
	recurringItemId: string | null;
	bankAccountId: string | null;
	countedInDebt: boolean;
	sparkline: number[];
	cells: Record<string, { plan: number; actual: number | null }>;
};
type Section = { id: string; type: SectionType; rows: Row[]; totals: Record<string, number> };

function monthAt(offset: number) {
	const now = new Date();
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const ym = `${year}-${String(month).padStart(2, "0")}`;
	return { year, month, day: (day: number) => `${ym}-${String(day).padStart(2, "0")}` };
}

const NEXT = monthAt(1);
const LAST = monthAt(-1);

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string },
) {
	const res = await page.request.post(`${API}/accounts`, {
		data: { ...input, currentBalance: 500_000 },
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function createItem(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/recurring`, { data });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function addTransaction(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/transactions`, { data });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function tagTransfer(page: Page, id: string) {
	const res = await page.request.patch(`${API}/transactions/${id}`, {
		data: { tags: ["transfer"] },
	});
	expect(res.status()).toBe(200);
}

async function sections(page: Page, year: number) {
	const res = await page.request.get(`${API}/forecast/sections?year=${year}`);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: Section[] }).data;
}

async function fromRecurring(page: Page, year: number) {
	const res = await page.request.post(`${API}/forecast/rows/from-recurring`, { data: { year } });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Row[] }).data;
}

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const list = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = list.find((category) => category.name === name);
	if (!found) throw new Error(`No ${name} Category`);
	return found.id;
}

function rowNamed(list: Section[], name: string) {
	const row = list.flatMap((section) => section.rows).find((entry) => entry.name === name);
	if (!row) throw new Error(`No ${name} row`);
	return row;
}

test("Add from recurring seeds one linked row per active item with Plan amounts by cadence", async ({
	page,
}) => {
	const groceries = await categoryId(page, "Groceries");
	const netflix = await createItem(page, {
		merchantName: "Netflix",
		amount: 1_549,
		cadence: "monthly",
		nextDate: NEXT.day(15),
	});
	await createItem(page, {
		merchantName: "Costco membership",
		amount: 6_500,
		cadence: "yearly",
		nextDate: NEXT.day(3),
		categoryId: groceries,
	});
	await createItem(page, {
		merchantName: "Gym",
		amount: 1_000,
		cadence: "weekly",
		nextDate: NEXT.day(2),
	});
	await createItem(page, {
		merchantName: "Old plan",
		amount: 999,
		cadence: "monthly",
		nextDate: NEXT.day(1),
		isActive: false,
	});

	const created = await fromRecurring(page, NEXT.year);
	expect(created.map((row) => row.name).sort()).toEqual(["Costco membership", "Gym", "Netflix"]);

	const list = await sections(page, NEXT.year);
	const fixed = list.find((section) => section.type === "fixed_expense");
	const variable = list.find((section) => section.type === "variable_expense");
	expect(fixed?.rows.map((row) => row.name).sort()).toEqual(["Gym", "Netflix"]);
	expect(variable?.rows.map((row) => row.name)).toEqual(["Costco membership"]);

	const netflixRow = rowNamed(list, "Netflix");
	expect(netflixRow).toMatchObject({
		recurringItemId: netflix,
		dayOfMonth: 15,
		countedInDebt: false,
	});
	expect(netflixRow.sparkline).toEqual(Array(12).fill(1_549));

	const costco = rowNamed(list, "Costco membership");
	expect(costco.categoryId).toBe(groceries);
	expect(costco.sparkline.filter((amount) => amount > 0)).toEqual([6_500]);
	expect(costco.sparkline[NEXT.month - 1]).toBe(6_500);

	const weeks = rowNamed(list, "Gym").sparkline.reduce((sum, amount) => sum + amount, 0) / 1_000;
	expect([52, 53]).toContain(weeks);

	expect(await fromRecurring(page, NEXT.year)).toEqual([]);
});

test("a row linked to a RecurringItem reads Actuals from that merchant, not its Category", async ({
	page,
}) => {
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
	});
	const groceries = await categoryId(page, "Groceries");
	for (const name of ["Netflix", "Market"]) {
		await addTransaction(page, {
			name,
			amount: name === "Netflix" ? -1_549 : -4_500,
			date: LAST.day(10),
			categoryId: groceries,
			bankAccountId: checking,
		});
	}
	const item = await createItem(page, {
		merchantName: "netflix",
		amount: 1_549,
		cadence: "monthly",
		nextDate: NEXT.day(10),
	});
	const variable = (await sections(page, LAST.year)).find(
		(section) => section.type === "variable_expense",
	);
	const res = await page.request.post(`${API}/forecast/rows`, {
		data: {
			sectionId: variable?.id,
			name: "Streaming",
			categoryId: groceries,
			recurringItemId: item,
		},
	});
	expect(res.status()).toBe(201);

	const row = rowNamed(await sections(page, LAST.year), "Streaming");
	expect(row.cells[String(LAST.month)]).toEqual({ plan: 0, actual: 1_549 });
});

test("a row whose RecurringItem pays a card is counted in Debt and left out of totals", async ({
	page,
}) => {
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
	});
	const card = await createAccount(page, { name: "Citi", type: "credit", displayGroup: "credit" });
	const payment = await addTransaction(page, {
		name: "Citi Card",
		amount: -20_000,
		date: LAST.day(12),
		bankAccountId: checking,
	});
	const receipt = await addTransaction(page, {
		name: "Payment thank you",
		amount: 20_000,
		date: LAST.day(13),
		bankAccountId: card,
	});
	await tagTransfer(page, payment);
	await tagTransfer(page, receipt);
	await createItem(page, {
		merchantName: "Citi Card",
		amount: 20_000,
		cadence: "monthly",
		nextDate: NEXT.day(12),
		bankAccountId: checking,
	});
	await createItem(page, {
		merchantName: "Rent",
		amount: 150_000,
		cadence: "monthly",
		nextDate: NEXT.day(1),
	});
	await fromRecurring(page, NEXT.year);

	const list = await sections(page, NEXT.year);
	expect(rowNamed(list, "Citi Card").countedInDebt).toBe(true);
	expect(rowNamed(list, "Rent").countedInDebt).toBe(false);
	const fixed = list.find((section) => section.type === "fixed_expense");
	expect(fixed?.totals[String(NEXT.month)]).toBe(150_000);

	await page.goto(`/forecast?year=${NEXT.year}`);
	await expect(page.getByRole("button", { name: /Citi Card/ })).toContainText("Counted in Debt");
});

test("forecast rows cannot link another User's RecurringItem", async ({ page, browser }) => {
	const context = await browser.newContext();
	const other = await context.newPage();
	await signUp(other);
	const theirs = await createItem(other, {
		merchantName: "Rent",
		amount: 150_000,
		cadence: "monthly",
		nextDate: NEXT.day(1),
	});
	const fixed = (await sections(page, NEXT.year)).find(
		(section) => section.type === "fixed_expense",
	);
	const create = await page.request.post(`${API}/forecast/rows`, {
		data: { sectionId: fixed?.id, name: "Rent", recurringItemId: theirs },
	});
	expect(create.status()).toBe(404);
	expect(await fromRecurring(page, NEXT.year)).toEqual([]);
	await context.close();
});

test("Add from recurring on the Year tab adds rows, and the drawer links a recurring bill", async ({
	page,
}) => {
	await createItem(page, {
		merchantName: "Netflix",
		amount: 1_549,
		cadence: "monthly",
		nextDate: NEXT.day(15),
	});
	await createItem(page, {
		merchantName: "Spotify",
		amount: 1_199,
		cadence: "monthly",
		nextDate: NEXT.day(20),
	});
	await page.goto(`/forecast?year=${NEXT.year}`);
	await page.getByRole("button", { name: "Add from recurring" }).click();
	await expect(page.getByText("Added 2 items")).toBeVisible();
	await page.getByRole("button", { name: "Add from recurring" }).click();
	await expect(page.getByText("Every recurring bill is already on the plan")).toBeVisible();

	await page.getByRole("button", { name: /Netflix/ }).click();
	const drawer = page.getByRole("dialog", { name: "Netflix" });
	await expect(drawer.getByLabel("Recurring bill")).toHaveText("Netflix");
	await drawer.getByLabel("Recurring bill").click();
	await page.getByRole("option", { name: "Spotify" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Item saved")).toBeVisible();

	const spotify = (await page.request.get(`${API}/recurring`).then((res) => res.json())) as {
		data: { items: { id: string; merchantName: string }[] };
	};
	const spotifyId = spotify.data.items.find((item) => item.merchantName === "Spotify")?.id;
	const rows = (await sections(page, NEXT.year)).flatMap((section) => section.rows);
	expect(
		rows
			.filter((row) => row.recurringItemId === spotifyId)
			.map((row) => row.name)
			.sort(),
	).toEqual(["Netflix", "Spotify"]);
});
