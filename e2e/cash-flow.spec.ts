import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type CashFlowDay = {
	day: number;
	date: string;
	income: number;
	expenses: number;
	net: number;
	runningBalance: number | null;
};
type CashFlow = {
	year: number;
	month: number;
	baseCurrency: string;
	accountId: string | null;
	runningBalanceKind: "net_worth" | "balance" | "owed";
	summary: { totalIncome: number; totalExpenses: number; netCashFlow: number };
	daily: CashFlowDay[];
	omittedCurrencies: string[];
};

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function addTransaction(
	page: Page,
	input: { name: string; amount: number; date: string; bankAccountId: string },
) {
	const res = await page.request.post(`${API}/transactions`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function getCashFlow(page: Page, query: string) {
	const res = await page.request.get(`${API}/cash-flow?${query}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: CashFlow }).data;
}

function day(flow: CashFlow, value: number) {
	const found = flow.daily.find((row) => row.day === value);
	if (!found) throw new Error(`No day ${value}`);
	return found;
}

/**
 * March 2025 on two manual BankAccounts (checking $1,000.00, card owing $200.00):
 * salary +$2,500 (3/1), groceries -$120 (3/5), a $50 card payment Transfer (3/10),
 * dining -$30 on the card (3/10), and -$10 in April that still moves March balances.
 */
async function seedMarch(page: Page) {
	const checking = await createAccount(page, {
		name: "Flow Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100000,
	});
	const card = await createAccount(page, {
		name: "Flow Card",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 20000,
	});
	await addTransaction(page, {
		name: "Salary",
		amount: 250000,
		date: "2025-03-01",
		bankAccountId: checking,
	});
	await addTransaction(page, {
		name: "Groceries",
		amount: -12000,
		date: "2025-03-05",
		bankAccountId: checking,
	});
	const paymentOut = await addTransaction(page, {
		name: "Card payment",
		amount: -5000,
		date: "2025-03-10",
		bankAccountId: checking,
	});
	const paymentIn = await addTransaction(page, {
		name: "Payment received",
		amount: 5000,
		date: "2025-03-10",
		bankAccountId: card,
	});
	for (const id of [paymentOut, paymentIn]) {
		const res = await page.request.patch(`${API}/transactions/${id}`, {
			data: { tags: ["transfer"] },
		});
		signedExpect(res.status()).toBe(200);
	}
	await addTransaction(page, {
		name: "Dinner",
		amount: -3000,
		date: "2025-03-10",
		bankAccountId: card,
	});
	await addTransaction(page, {
		name: "April coffee",
		amount: -1000,
		date: "2025-04-02",
		bankAccountId: checking,
	});
	return { checking, card };
}

unsigned("cash-flow rejects an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/cash-flow`)).status()).toBe(401);
});

test("month totals exclude Transfers and the running balance walks back from today", async ({
	page,
}) => {
	await seedMarch(page);
	const flow = await getCashFlow(page, "year=2025&month=3");

	signedExpect(flow.baseCurrency).toBe("USD");
	signedExpect(flow.runningBalanceKind).toBe("net_worth");
	signedExpect(flow.summary).toEqual({
		totalIncome: 250000,
		totalExpenses: 15000,
		netCashFlow: 235000,
	});
	signedExpect(flow.daily).toHaveLength(31);
	signedExpect(day(flow, 1)).toMatchObject({ date: "2025-03-01", income: 250000, expenses: 0 });
	signedExpect(day(flow, 5)).toMatchObject({ income: 0, expenses: 12000, net: -12000 });
	// The $50 payment is a Transfer, so day 10 shows only the $30 dinner.
	signedExpect(day(flow, 10)).toMatchObject({ income: 0, expenses: 3000 });

	// Net worth today is $1,000 - $200 = $800; undo every later Transaction to step back.
	signedExpect(day(flow, 31).runningBalance).toBe(81000);
	signedExpect(day(flow, 10).runningBalance).toBe(81000);
	signedExpect(day(flow, 9).runningBalance).toBe(84000);
	signedExpect(day(flow, 1).runningBalance).toBe(96000);
	signedExpect(flow.omittedCurrencies).toEqual([]);

	const empty = await getCashFlow(page, "year=2025&month=2");
	signedExpect(empty.summary.netCashFlow).toBe(0);
	signedExpect(empty.daily).toHaveLength(28);
});

test("account scope narrows totals; a card reads as amount owed", async ({ page }) => {
	const { checking, card } = await seedMarch(page);

	const cash = await getCashFlow(page, `year=2025&month=3&accountId=${checking}`);
	signedExpect(cash.accountId).toBe(checking);
	signedExpect(cash.runningBalanceKind).toBe("balance");
	signedExpect(cash.summary).toEqual({
		totalIncome: 250000,
		totalExpenses: 12000,
		netCashFlow: 238000,
	});
	signedExpect(day(cash, 31).runningBalance).toBe(101000);

	const credit = await getCashFlow(page, `year=2025&month=3&accountId=${card}`);
	signedExpect(credit.runningBalanceKind).toBe("owed");
	signedExpect(credit.summary.totalExpenses).toBe(3000);
	signedExpect(day(credit, 9).runningBalance).toBe(22000);
	signedExpect(day(credit, 10).runningBalance).toBe(20000);
});

test("future days have no running balance; bad input and foreign accounts are refused", async ({
	page,
}) => {
	const { checking } = await seedMarch(page);
	const future = await getCashFlow(page, "year=2099&month=12");
	signedExpect(future.daily.every((row) => row.runningBalance === null)).toBe(true);

	signedExpect((await page.request.get(`${API}/cash-flow?month=13`)).status()).toBe(400);
	signedExpect((await page.request.get(`${API}/cash-flow?accountId=nope`)).status()).toBe(400);
	signedExpect(
		(
			await page.request.get(`${API}/cash-flow?accountId=00000000-0000-4000-8000-000000000000`)
		).status(),
	).toBe(404);

	const other = await page.context().browser()?.newContext();
	if (!other) throw new Error("No browser");
	const otherPage = await other.newPage();
	await signUp(otherPage);
	signedExpect(
		(await otherPage.request.get(`${API}/cash-flow?accountId=${checking}`)).status(),
	).toBe(404);
	await other.close();
});

test("Cash Flow page: KPI cards, month navigator, scope, chart interval, and feed", async ({
	page,
}) => {
	const { checking } = await seedMarch(page);
	await page.goto("/cash-flow?month=2025-03");

	await signedExpect(page.getByRole("heading", { name: "Cash Flow", level: 1 })).toBeVisible();
	await signedExpect(page.getByText("March 2025")).toBeVisible();
	await signedExpect(page.getByRole("region", { name: "Income", exact: true })).toContainText(
		"$2,500.00",
	);
	await signedExpect(page.getByRole("region", { name: "Expenses", exact: true })).toContainText(
		"$150.00",
	);
	await signedExpect(page.getByRole("region", { name: "Net", exact: true })).toContainText(
		"+$2,350.00",
	);
	await signedExpect(page.getByRole("figure", { name: "Daily income and expenses" })).toBeVisible();

	const feed = page.getByRole("list", { name: "Transactions" });
	await signedExpect(feed.getByRole("button", { name: /Groceries/ })).toBeVisible();
	await signedExpect(feed.getByRole("button", { name: /April coffee/ })).toHaveCount(0);

	await page.getByRole("button", { name: "Weekly" }).click();
	await signedExpect(page).toHaveURL(/view=weekly/);
	await signedExpect(
		page.getByRole("figure", { name: "Weekly income and expenses" }),
	).toBeVisible();

	await page.getByLabel("Account scope").selectOption({ label: "Flow Checking" });
	await signedExpect(page).toHaveURL(new RegExp(`account=${checking}`));
	await signedExpect(page.getByRole("region", { name: "Expenses", exact: true })).toContainText(
		"$120.00",
	);
	await signedExpect(feed.getByRole("button", { name: /Dinner/ })).toHaveCount(0);

	await page.getByRole("button", { name: "Next month" }).click();
	await signedExpect(page).toHaveURL(/month=2025-04/);
	await signedExpect(page.getByText("April 2025")).toBeVisible();
	await signedExpect(page.getByRole("region", { name: "Expenses", exact: true })).toContainText(
		"$10.00",
	);
	await signedExpect(feed.getByRole("button", { name: /April coffee/ })).toBeVisible();

	await page.goBack();
	await signedExpect(page.getByText("March 2025")).toBeVisible();

	await feed.getByRole("button", { name: /Groceries/ }).click({ position: { x: 60, y: 12 } });
	await signedExpect(page.getByRole("dialog")).toBeVisible();
});
