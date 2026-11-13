import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { daysAgo } from "./helpers/snapshots";

const API = "http://localhost:3000/api";

type SectionType = "revenue" | "savings" | "fixed_expense" | "variable_expense";
type Row = {
	id: string;
	name: string;
	dayOfMonth: number | null;
	categoryId: string | null;
	bankAccountId: string | null;
	goalId: string | null;
	typicalMonthly: number;
	sparkline: number[];
	cells: Record<string, { plan: number; actual: number | null }>;
};
type OneOff = {
	id: string;
	sectionId: string;
	name: string;
	date: string;
	amount: number;
	status: "expected" | "done" | "cancelled";
	matchedTransactionId: string | null;
};
type Section = {
	id: string;
	name: string;
	type: SectionType;
	rows: Row[];
	oneOffs: OneOff[];
	totals: Record<string, number>;
};
type MonthItem = { kind: string; name: string; amount: number; sourceId: string | null };
type ForecastMonth = {
	safetyBuffer: number;
	openingBalance: number;
	lowPoint: { date: string; value: number };
	shortfalls: { date: string; short: number }[];
	days: { date: string; net: number; balanceAfter: number; items: MonthItem[] }[];
};
type Summary = {
	operatingCash: Record<string, number>;
	creditCardTotal: Record<string, number>;
	savingsTotal: Record<string, number>;
	shortfalls: { date: string; short: number }[];
};

function monthAt(offset: number) {
	const now = new Date();
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const ym = `${year}-${String(month).padStart(2, "0")}`;
	return { year, month, ym, day: (day: number) => `${ym}-${String(day).padStart(2, "0")}` };
}

const NEXT = monthAt(1);
const LAST = monthAt(-1);

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function sections(page: Page, year: number) {
	const res = await page.request.get(`${API}/forecast/sections?year=${year}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Section[] }).data;
}

async function sectionId(page: Page, type: SectionType) {
	const found = (await sections(page, NEXT.year)).find((section) => section.type === type);
	if (!found) throw new Error(`No ${type} section`);
	return found.id;
}

async function createRow(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/forecast/rows`, { data });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function setAmounts(page: Page, rowId: string, body: Record<string, unknown>) {
	const res = await page.request.put(`${API}/forecast/rows/${rowId}/amounts`, { data: body });
	signedExpect(res.status()).toBe(200);
}

/** A plan row with one amount in next month. */
async function nextMonthRow(page: Page, type: SectionType, data: Record<string, unknown>) {
	const { amount, ...rest } = data;
	const id = await createRow(page, { sectionId: await sectionId(page, type), ...rest });
	await setAmounts(page, id, { year: NEXT.year, amounts: { [NEXT.month]: amount } });
	return id;
}

async function forecastMonth(page: Page, at: { year: number; month: number }) {
	const res = await page.request.get(`${API}/forecast/month?year=${at.year}&month=${at.month}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: ForecastMonth }).data;
}

async function summary(page: Page, year: number) {
	const res = await page.request.get(`${API}/forecast/summary?year=${year}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Summary }).data;
}

async function createOneOff(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/forecast/one-offs`, { data });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: OneOff }).data;
}

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const list = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = list.find((category) => category.name === name);
	if (!found) throw new Error(`No ${name} Category`);
	return found.id;
}

async function otherUserPage(page: Page) {
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	const other = await context.newPage();
	await signUp(other);
	return { other, close: () => context.close() };
}

unsigned("forecast APIs reject an unauthenticated request", async ({ request }) => {
	for (const path of ["sections?year=2027", "summary?year=2027", "month?year=2027&month=1"]) {
		expect((await request.get(`${API}/forecast/${path}`)).status()).toBe(401);
	}
	expect((await request.get(`${API}/forecast/one-offs?year=2027`)).status()).toBe(401);
});

test("a new plan starts with Revenue, Savings, Fixed and Variable expense sections", async ({
	page,
}) => {
	const list = await sections(page, NEXT.year);
	signedExpect(list.map((section) => [section.name, section.type])).toEqual([
		["Revenue", "revenue"],
		["Savings", "savings"],
		["Fixed expenses", "fixed_expense"],
		["Variable expenses", "variable_expense"],
	]);
	signedExpect((await sections(page, NEXT.year)).length).toBe(4);
});

test("copying a plan amount to all months sets every month and the typical amount", async ({
	page,
}) => {
	const id = await createRow(page, {
		sectionId: await sectionId(page, "fixed_expense"),
		name: "Rent",
		dayOfMonth: 1,
	});
	await setAmounts(page, id, { year: NEXT.year, amounts: { 1: 150_000 }, copyToAll: true });
	const row = (await sections(page, NEXT.year))
		.flatMap((section) => section.rows)
		.find((entry) => entry.id === id);
	signedExpect(row?.typicalMonthly).toBe(150_000);
	signedExpect(row?.sparkline).toEqual(Array(12).fill(150_000));
	signedExpect(row?.cells["12"]?.plan).toBe(150_000);
});

test("the Month projection lands plan items on their days with the balance after", async ({
	page,
}) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 500_000,
	});
	const salary = await nextMonthRow(page, "revenue", {
		name: "Salary",
		dayOfMonth: 15,
		amount: 300_000,
	});
	await nextMonthRow(page, "fixed_expense", { name: "Rent", dayOfMonth: 20, amount: 100_000 });

	const data = await forecastMonth(page, NEXT);
	signedExpect(data.openingBalance).toBe(500_000);
	const payday = data.days.find((day) => day.date === NEXT.day(15));
	signedExpect(payday?.balanceAfter).toBe(800_000);
	signedExpect(payday?.items).toEqual([
		{ kind: "revenue", name: "Salary", amount: 300_000, sourceId: salary },
	]);
	signedExpect(data.days.find((day) => day.date === NEXT.day(20))?.balanceAfter).toBe(700_000);
	signedExpect(data.lowPoint.value).toBe(500_000);
});

test("a row paid from a card adds to the card total, not Operating cash", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 500_000,
	});
	const card = await createAccount(page, {
		name: "Visa",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 20_000,
	});
	// Out of the debt plan so Payback (Phase 10) leaves the card total alone.
	const outOfPlan = await page.request.patch(`${API}/accounts/${card}`, {
		data: { inDebtPlan: false },
	});
	signedExpect(outOfPlan.status()).toBe(200);
	await nextMonthRow(page, "variable_expense", {
		name: "Dining",
		dayOfMonth: 10,
		bankAccountId: card,
		amount: 5_000,
	});

	const data = await summary(page, NEXT.year);
	signedExpect(data.operatingCash[String(NEXT.month)]).toBe(500_000);
	signedExpect(data.creditCardTotal[String(NEXT.month)]).toBe(25_000);
	const month = await forecastMonth(page, NEXT);
	signedExpect(month.days.flatMap((day) => day.items)).toEqual([]);
});

test("a day below the Safety buffer is a shortfall until the buffer drops", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 20_000,
	});
	await nextMonthRow(page, "fixed_expense", { name: "Phone", dayOfMonth: 5, amount: 10_000 });

	const before = await forecastMonth(page, NEXT);
	signedExpect(before.safetyBuffer).toBe(15_000);
	signedExpect(before.shortfalls).toEqual([{ date: NEXT.day(5), short: 5_000 }]);

	const patched = await page.request.patch(`${API}/settings`, { data: { safetyBuffer: 5_000 } });
	signedExpect(patched.status()).toBe(200);
	signedExpect((await forecastMonth(page, NEXT)).shortfalls).toEqual([]);
});

test("a savings row into a Fund moves Operating cash into savings", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 500_000,
	});
	const savings = await createAccount(page, {
		name: "High Yield",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	const goal = await page.request.post(`${API}/goals`, {
		data: {
			name: "Vacation",
			type: "save_up",
			funding: "fund",
			hostBankAccountId: savings,
			targetAmount: 500_000,
		},
	});
	signedExpect(goal.status()).toBe(201);
	const goalId = ((await goal.json()) as { data: { id: string } }).data.id;
	await nextMonthRow(page, "savings", { name: "Vacation", dayOfMonth: 1, goalId, amount: 20_000 });

	const data = await summary(page, NEXT.year);
	signedExpect(data.operatingCash[String(NEXT.month)]).toBe(480_000);
	signedExpect(data.savingsTotal[String(NEXT.month)]).toBe(120_000);
	const month = await forecastMonth(page, NEXT);
	signedExpect(month.days.find((day) => day.date === NEXT.day(1))?.items[0]?.kind).toBe("savings");
});

test("a savings row only points at a Fund", async ({ page }) => {
	const res = await page.request.post(`${API}/forecast/rows`, {
		data: {
			sectionId: await sectionId(page, "fixed_expense"),
			name: "Bad",
			goalId: "00000000-0000-4000-8000-000000000000",
		},
	});
	signedExpect(res.status()).toBe(400);
});

test("expected One-offs project and cancelled ones do not", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	const oneOff = await createOneOff(page, {
		sectionId: await sectionId(page, "revenue"),
		name: "Reimbursement",
		date: NEXT.day(12),
		amount: 25_000,
	});
	signedExpect(oneOff.status).toBe("expected");
	const before = await forecastMonth(page, NEXT);
	signedExpect(before.days.find((day) => day.date === NEXT.day(12))?.balanceAfter).toBe(125_000);

	const cancelled = await page.request.patch(`${API}/forecast/one-offs/${oneOff.id}`, {
		data: { status: "cancelled" },
	});
	signedExpect(cancelled.status()).toBe(200);
	const after = await forecastMonth(page, NEXT);
	signedExpect(after.days.flatMap((day) => day.items)).toEqual([]);
});

test("a matching Transaction marks an expected One-off done after sync", async ({ page }) => {
	const date = daysAgo(2);
	const year = Number(date.slice(0, 4));
	const revenue = (await sections(page, year)).find((section) => section.type === "revenue");
	const oneOff = await createOneOff(page, {
		sectionId: revenue?.id,
		name: "Payroll",
		date,
		amount: 340_000,
	});
	const exchange = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	signedExpect(exchange.status()).toBe(200);
	signedExpect((await page.request.post(`${API}/plaid/sync-all`)).status()).toBe(200);

	const res = await page.request.get(`${API}/forecast/one-offs?year=${year}`);
	const list = ((await res.json()) as { data: OneOff[] }).data;
	const matched = list.find((entry) => entry.id === oneOff.id);
	signedExpect(matched?.status).toBe("done");
	signedExpect(matched?.matchedTransactionId).toBeTruthy();
});

test("past months show Actuals from the row's Category", async ({ page }) => {
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	const groceries = await categoryId(page, "Groceries");
	const spend = await page.request.post(`${API}/transactions`, {
		data: {
			name: "Market",
			amount: -4_500,
			date: LAST.day(10),
			categoryId: groceries,
			bankAccountId: checking,
		},
	});
	signedExpect(spend.status()).toBe(201);
	const variable = (await sections(page, LAST.year)).find(
		(section) => section.type === "variable_expense",
	);
	const id = await createRow(page, {
		sectionId: variable?.id,
		name: "Groceries",
		categoryId: groceries,
	});

	const row = (await sections(page, LAST.year))
		.flatMap((section) => section.rows)
		.find((entry) => entry.id === id);
	signedExpect(row?.cells[String(LAST.month)]).toEqual({ plan: 0, actual: 4_500 });
});

test("Add from categories seeds rows once and skips Uncategorized", async ({ page }) => {
	const res = await page.request.post(`${API}/forecast/rows/from-categories`, {
		data: { year: NEXT.year },
	});
	signedExpect(res.status()).toBe(201);
	const list = await sections(page, NEXT.year);
	const names = (type: SectionType) =>
		list.find((section) => section.type === type)?.rows.map((row) => row.name) ?? [];
	signedExpect(names("revenue")).toContain("Salary");
	signedExpect(names("fixed_expense")).toContain("Housing");
	signedExpect(names("variable_expense")).toContain("Groceries");
	signedExpect(names("savings")).toEqual(["Savings Transfer"]);
	signedExpect(list.flatMap((section) => section.rows.map((row) => row.name))).not.toContain(
		"Uncategorized",
	);

	const again = await page.request.post(`${API}/forecast/rows/from-categories`, {
		data: { year: NEXT.year },
	});
	signedExpect(((await again.json()) as { data: unknown[] }).data).toEqual([]);
});

test("turning off In cash plan takes a checking account out of Operating cash", async ({
	page,
}) => {
	await createAccount(page, {
		name: "Main",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	const side = await createAccount(page, {
		name: "Side",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 50_000,
	});
	signedExpect((await forecastMonth(page, NEXT)).openingBalance).toBe(150_000);

	const off = await page.request.patch(`${API}/accounts/${side}`, { data: { inCashPlan: false } });
	signedExpect(off.status()).toBe(200);
	signedExpect(((await off.json()) as { data: { inCashPlan: boolean } }).data.inCashPlan).toBe(
		false,
	);
	signedExpect((await forecastMonth(page, NEXT)).openingBalance).toBe(100_000);

	const card = await createAccount(page, {
		name: "Visa",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 0,
	});
	const bad = await page.request.patch(`${API}/accounts/${card}`, { data: { inCashPlan: true } });
	signedExpect(bad.status()).toBe(400);
});

test("forecast settings validate the Safety buffer, payback day, and strategy", async ({
	page,
}) => {
	for (const data of [{ safetyBuffer: -1 }, { paybackDay: 32 }, { debtStrategy: "random" }]) {
		signedExpect((await page.request.patch(`${API}/settings`, { data })).status()).toBe(400);
	}
	const res = await page.request.patch(`${API}/settings`, {
		data: { safetyBuffer: 20_000, paybackDay: 15, debtStrategy: "snowball" },
	});
	signedExpect(res.status()).toBe(200);
	signedExpect((await res.json()) as { data: Record<string, unknown> }).toMatchObject({
		data: { safetyBuffer: 20_000, paybackDay: 15, debtStrategy: "snowball" },
	});
});

test("another User cannot read or change this plan", async ({ page }) => {
	const fixed = await sectionId(page, "fixed_expense");
	const row = await createRow(page, { sectionId: fixed, name: "Rent" });
	const oneOff = await createOneOff(page, {
		sectionId: fixed,
		name: "Repair",
		date: NEXT.day(3),
		amount: -10_000,
	});

	const { other, close } = await otherUserPage(page);
	try {
		signedExpect(
			(
				await other.request.patch(`${API}/forecast/rows/${row}`, { data: { name: "Mine" } })
			).status(),
		).toBe(404);
		signedExpect(
			(
				await other.request.put(`${API}/forecast/rows/${row}/amounts`, {
					data: { year: NEXT.year, amounts: { 1: 1 } },
				})
			).status(),
		).toBe(404);
		signedExpect((await other.request.delete(`${API}/forecast/rows/${row}`)).status()).toBe(404);
		signedExpect(
			(
				await other.request.patch(`${API}/forecast/one-offs/${oneOff.id}`, {
					data: { status: "done" },
				})
			).status(),
		).toBe(404);
		signedExpect(
			(
				await other.request.post(`${API}/forecast/rows`, { data: { sectionId: fixed, name: "X" } })
			).status(),
		).toBe(404);
		const theirs = await sections(other, NEXT.year);
		signedExpect(theirs.flatMap((section) => section.rows)).toEqual([]);
		signedExpect(theirs.flatMap((section) => section.oneOffs)).toEqual([]);
	} finally {
		await close();
	}
});

test("Year tab: add an item and set its amounts in the drawer", async ({ page }) => {
	await page.goto(`/forecast?year=${NEXT.year}`);
	const fixed = page.getByRole("region", { name: "Fixed expenses" });
	await fixed.getByRole("button", { name: "Add item to Fixed expenses" }).click();

	const drawer = page.getByRole("dialog", { name: "New item" });
	await drawer.getByLabel("Name").fill("Rent");
	await drawer.getByLabel("Day of month").fill("1");
	await drawer.getByLabel("Amount for every month").fill("1500");
	await drawer.getByRole("button", { name: "Copy to all months" }).click();
	await signedExpect(drawer.getByLabel("December")).toHaveValue("1500.00");
	await drawer.getByRole("button", { name: "Save item" }).click();

	await signedExpect(page.getByText("Item saved")).toBeVisible();
	await signedExpect(fixed.getByRole("button", { name: /Rent.*\$1,500\.00\/mo/ })).toBeVisible();
});

test("a shortfall in the Year callout opens that Month", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 20_000,
	});
	await nextMonthRow(page, "fixed_expense", { name: "Phone", dayOfMonth: 5, amount: 10_000 });

	await page.goto(`/forecast?year=${NEXT.year}`);
	const callout = page.getByRole("region", { name: /shortfall/ });
	await callout.getByRole("button", { name: /-\$50\.00/ }).click();

	await signedExpect(page).toHaveURL(
		new RegExp(`tab=month.*month=${NEXT.ym}|month=${NEXT.ym}.*tab=month`),
	);
	await signedExpect(page.getByText("Low point")).toBeVisible();
	const label = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
		new Date(`${NEXT.day(5)}T00:00:00Z`),
	);
	const day = page.getByRole("region", { name: label });
	await signedExpect(day.getByText("Phone")).toBeVisible();
	await signedExpect(day.getByText("balance $100.00")).toBeVisible();
});
