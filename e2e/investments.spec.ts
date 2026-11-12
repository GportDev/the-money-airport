import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { daysAgo, seedSnapshot } from "./helpers/snapshots";

const API = "http://localhost:3000/api";

type InvestmentAccount = {
	id: string;
	name: string;
	displayGroup: string;
	currentBalance: number;
	isoCurrencyCode: string;
	value: number;
	change: number;
	sparkline: { date: string; value: number }[];
};
type Investments = {
	range: "1m" | "3m" | "1y";
	baseCurrency: string;
	total: number;
	change: number;
	changePercent: number;
	allocation: { accountId: string; name: string; value: number }[];
	accounts: InvestmentAccount[];
	omittedCurrencies: string[];
};

async function getInvestments(page: Page, query = "") {
	const res = await page.request.get(`${API}/investments${query}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Investments }).data;
}

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

/** Brokerage $10,000 (was $9,000 20 days ago, $8,000 60 days ago), IRA $2,500, checking $500. */
async function seedPortfolio(page: Page) {
	const brokerage = await createAccount(page, {
		name: "Brokerage",
		type: "investment",
		displayGroup: "investment",
		currentBalance: 1000000,
	});
	const ira = await createAccount(page, {
		name: "Roth IRA",
		type: "investment",
		displayGroup: "investment",
		currentBalance: 250000,
	});
	await createAccount(page, {
		name: "Everyday Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 50000,
	});
	seedSnapshot(brokerage, daysAgo(60), 800000);
	seedSnapshot(brokerage, daysAgo(20), 900000);
	return { brokerage, ira };
}

unsigned("investments reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/investments`)).status()).toBe(401);
});

test("no investment accounts returns an empty portfolio", async ({ page }) => {
	await createAccount(page, {
		name: "Only Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 50000,
	});
	const empty = await getInvestments(page);
	signedExpect(empty).toEqual({
		range: "1m",
		baseCurrency: "USD",
		total: 0,
		change: 0,
		changePercent: 0,
		allocation: [],
		accounts: [],
		omittedCurrencies: [],
	});
});

test("totals, change over range, and allocation cover visible investment accounts", async ({
	page,
}) => {
	const { brokerage, ira } = await seedPortfolio(page);

	const month = await getInvestments(page);
	signedExpect(month.total).toBe(1250000);
	signedExpect(month.allocation).toEqual([
		{ accountId: brokerage, name: "Brokerage", value: 1000000 },
		{ accountId: ira, name: "Roth IRA", value: 250000 },
	]);
	signedExpect(month.accounts.map((row) => row.name)).toEqual(["Brokerage", "Roth IRA"]);
	const brokerageRow = month.accounts.find((row) => row.id === brokerage);
	// 1 month starts 29 days back; the last snapshot on or before that is the $8,000 one.
	signedExpect(brokerageRow).toMatchObject({ value: 1000000, change: 200000 });
	signedExpect(brokerageRow?.sparkline.at(-1)).toEqual({ date: daysAgo(0), value: 1000000 });
	// The IRA has only today's snapshot, so it has not moved.
	signedExpect(month.accounts.find((row) => row.id === ira)?.change).toBe(0);
	signedExpect(month.change).toBe(200000);
	signedExpect(month.changePercent).toBeCloseTo(200000 / 1050000, 6);

	const quarter = await getInvestments(page, "?range=3m");
	signedExpect(quarter.range).toBe("3m");
	// 3 months starts before the first snapshot, so the earliest one in range is the start.
	signedExpect(quarter.change).toBe(200000);
	signedExpect(quarter.accounts.find((row) => row.id === brokerage)?.sparkline[0]).toEqual({
		date: daysAgo(60),
		value: 800000,
	});

	const hidden = await page.request.patch(`${API}/accounts/${ira}`, { data: { isHidden: true } });
	signedExpect(hidden.status()).toBe(200);
	const visible = await getInvestments(page);
	signedExpect(visible.total).toBe(1000000);
	signedExpect(visible.accounts.map((row) => row.id)).toEqual([brokerage]);

	signedExpect((await page.request.get(`${API}/investments?range=5y`)).status()).toBe(400);
});

test("another User sees none of the portfolio", async ({ page }) => {
	await seedPortfolio(page);
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	const other = await context.newPage();
	await signUp(other);
	const theirs = await getInvestments(other);
	signedExpect(theirs).toMatchObject({ total: 0, allocation: [], accounts: [] });
	await context.close();
});

test("Investments page shows an empty state that links to Accounts", async ({ page }) => {
	await page.goto("/investments");
	await signedExpect(page.getByRole("heading", { name: "Investments", level: 1 })).toBeVisible();
	await signedExpect(page.getByText("No investment accounts yet.")).toBeVisible();
	await signedExpect(page.getByRole("figure", { name: "Allocation by account" })).toHaveCount(0);
	await page.getByRole("link", { name: "Go to Accounts" }).click();
	await signedExpect(page).toHaveURL(/\/accounts$/);
});

test("Investments page: total, allocation, rows, and range toggle", async ({ page }) => {
	await seedPortfolio(page);
	await page.goto("/investments");

	const summary = page.getByRole("region", { name: "Portfolio total" });
	await signedExpect(summary).toContainText("$12,500.00");
	await signedExpect(summary).toContainText("+$2,000.00");
	await signedExpect(page.getByRole("figure", { name: "Allocation by account" })).toBeVisible();
	const list = page.getByRole("list", { name: "Investment accounts" });
	await signedExpect(list.getByRole("listitem")).toHaveCount(2);
	const brokerage = list.getByRole("listitem").filter({ hasText: "Brokerage" });
	await signedExpect(brokerage).toContainText("$10,000.00");
	await signedExpect(brokerage).toContainText("+$2,000.00");
	await signedExpect(brokerage).toContainText("80%");
	await signedExpect(list.getByText("Everyday Checking")).toHaveCount(0);

	await page.getByRole("button", { name: "1 year" }).click();
	await signedExpect(page).toHaveURL(/range=1y/);
	await signedExpect(page.getByRole("button", { name: "1 year" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});
