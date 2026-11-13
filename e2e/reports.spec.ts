import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { daysAgo, seedSnapshot } from "./helpers/snapshots";

const API = "http://localhost:3000/api";
const MARCH = "dateFrom=2025-03-01&dateTo=2025-03-31";

type CategoryTotal = {
	categoryId: string;
	categoryName: string;
	color: string;
	icon: string;
	total: number;
};
type Spending = { baseCurrency: string; omittedCurrencies: string[]; categories: CategoryTotal[] };
type IncomeVsExpenses = {
	baseCurrency: string;
	omittedCurrencies: string[];
	months: { month: string; income: number; expenses: number }[];
};
type CashFlowTrend = {
	baseCurrency: string;
	omittedCurrencies: string[];
	months: { month: string; net: number }[];
};
type BalanceHistory = {
	baseCurrency: string;
	omittedCurrencies: string[];
	accounts: { accountId: string; name: string; isAsset: boolean }[];
	points: { date: string; accountId: string; balance: number }[];
};

async function getReport<T>(page: Page, path: string) {
	const res = await page.request.get(`${API}/reports/${path}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: T }).data;
}

async function categoryIds(page: Page) {
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	return (name: string) => {
		const found = rows.find((row) => row.name === name);
		if (!found) throw new Error(`No category ${name}`);
		return found.id;
	};
}

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

/**
 * One checking account: salary +$2,500 (3/1), market -$120 (3/5) with a $20 refund (3/6),
 * bistro -$30 (3/10), a $50 Transfer filed under Groceries (3/10), and -$10 coffee in April.
 */
async function seedMarch(page: Page) {
	const bankAccountId = await createAccount(page, {
		name: "Report Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100000,
	});
	const id = await categoryIds(page);
	const rows = [
		{ name: "Salary", amount: 250000, date: "2025-03-01", category: "Salary" },
		{ name: "Market", amount: -12000, date: "2025-03-05", category: "Groceries" },
		{ name: "Market refund", amount: 2000, date: "2025-03-06", category: "Groceries" },
		{ name: "Bistro", amount: -3000, date: "2025-03-10", category: "Dining" },
		{
			name: "To savings",
			amount: -5000,
			date: "2025-03-10",
			category: "Groceries",
			transfer: true,
		},
		{ name: "April coffee", amount: -1000, date: "2025-04-02", category: "Dining" },
	];
	for (const row of rows) {
		const res = await page.request.post(`${API}/transactions`, {
			data: {
				name: row.name,
				amount: row.amount,
				date: row.date,
				bankAccountId,
				categoryId: id(row.category),
			},
		});
		signedExpect(res.status()).toBe(201);
		if (row.transfer) {
			const created = ((await res.json()) as { data: { id: string } }).data.id;
			const patched = await page.request.patch(`${API}/transactions/${created}`, {
				data: { tags: ["transfer"] },
			});
			signedExpect(patched.status()).toBe(200);
		}
	}
	return { bankAccountId, id };
}

async function otherUserPage(page: Page) {
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	const other = await context.newPage();
	await signUp(other);
	return { other, close: () => context.close() };
}

unsigned("reports reject an unauthenticated request", async ({ request }) => {
	for (const path of [
		"spending-by-category",
		"income-vs-expenses",
		"cash-flow-trend",
		"top-categories",
		"balance-history",
	]) {
		expect((await request.get(`${API}/reports/${path}?${MARCH}`)).status()).toBe(401);
	}
});

test("spending by category nets refunds, skips Transfers and income", async ({ page }) => {
	await seedMarch(page);
	const spending = await getReport<Spending>(page, `spending-by-category?${MARCH}`);

	signedExpect(spending.baseCurrency).toBe("USD");
	signedExpect(spending.omittedCurrencies).toEqual([]);
	signedExpect(
		spending.categories.map(({ categoryName, total }) => ({ categoryName, total })),
	).toEqual([
		{ categoryName: "Groceries", total: 10000 },
		{ categoryName: "Dining", total: 3000 },
	]);
	signedExpect(spending.categories[0]?.icon).toBeTruthy();
	signedExpect(spending.categories[0]?.color).toMatch(/^#/);

	const top = await getReport<Spending>(page, `top-categories?${MARCH}&limit=1`);
	signedExpect(top.categories.map((row) => row.categoryName)).toEqual(["Groceries"]);
	const defaultTop = await getReport<Spending>(page, `top-categories?${MARCH}`);
	signedExpect(defaultTop.categories).toHaveLength(2);
});

test("income vs expenses and net cash flow bucket every month like Cash Flow", async ({ page }) => {
	await seedMarch(page);
	const range = "dateFrom=2025-02-15&dateTo=2025-04-30";
	const flow = await getReport<IncomeVsExpenses>(page, `income-vs-expenses?${range}`);
	signedExpect(flow.months).toEqual([
		{ month: "2025-02", income: 0, expenses: 0 },
		{ month: "2025-03", income: 252000, expenses: 15000 },
		{ month: "2025-04", income: 0, expenses: 1000 },
	]);

	const trend = await getReport<CashFlowTrend>(page, `cash-flow-trend?${range}`);
	signedExpect(trend.months).toEqual([
		{ month: "2025-02", net: 0 },
		{ month: "2025-03", net: 237000 },
		{ month: "2025-04", net: -1000 },
	]);

	const clipped = await getReport<IncomeVsExpenses>(
		page,
		"income-vs-expenses?dateFrom=2025-03-02&dateTo=2025-03-31",
	);
	signedExpect(clipped.months).toEqual([{ month: "2025-03", income: 2000, expenses: 15000 }]);
});

test("balance history carries snapshots forward per visible account", async ({ page }) => {
	const checking = await createAccount(page, {
		name: "History Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 50000,
	});
	const card = await createAccount(page, {
		name: "History Card",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 20000,
	});
	seedSnapshot(checking, daysAgo(3), 40000);
	const range = `dateFrom=${daysAgo(4)}&dateTo=${daysAgo(0)}`;

	const history = await getReport<BalanceHistory>(page, `balance-history?${range}`);
	signedExpect(history.accounts).toEqual(
		signedExpect.arrayContaining([
			{ accountId: checking, name: "History Checking", isAsset: true },
			{ accountId: card, name: "History Card", isAsset: false },
		]),
	);
	const checkingPoints = history.points.filter((point) => point.accountId === checking);
	signedExpect(checkingPoints).toEqual([
		{ date: daysAgo(3), accountId: checking, balance: 40000 },
		{ date: daysAgo(2), accountId: checking, balance: 40000 },
		{ date: daysAgo(1), accountId: checking, balance: 40000 },
		{ date: daysAgo(0), accountId: checking, balance: 50000 },
	]);
	signedExpect(history.points.filter((point) => point.accountId === card)).toEqual([
		{ date: daysAgo(0), accountId: card, balance: 20000 },
	]);

	const one = await getReport<BalanceHistory>(page, `balance-history?${range}&accountId=${card}`);
	signedExpect(one.accounts.map((row) => row.accountId)).toEqual([card]);
	signedExpect(one.points.every((point) => point.accountId === card)).toBe(true);

	const hidden = await page.request.patch(`${API}/accounts/${card}`, { data: { isHidden: true } });
	signedExpect(hidden.status()).toBe(200);
	const visible = await getReport<BalanceHistory>(page, `balance-history?${range}`);
	signedExpect(visible.accounts.map((row) => row.accountId)).toEqual([checking]);
});

test("reports refuse bad ranges and other Users' data", async ({ page }) => {
	const { bankAccountId } = await seedMarch(page);
	for (const query of [
		"",
		"dateFrom=2025-03-01",
		"dateFrom=2025-02-30&dateTo=2025-03-31",
		"dateFrom=2025-3-1&dateTo=2025-03-31",
		"dateFrom=2025-04-01&dateTo=2025-03-01",
		"dateFrom=2019-01-01&dateTo=2025-03-31",
	]) {
		const res = await page.request.get(`${API}/reports/income-vs-expenses?${query}`);
		signedExpect(res.status(), query).toBe(400);
	}
	signedExpect(
		(await page.request.get(`${API}/reports/top-categories?${MARCH}&limit=0`)).status(),
	).toBe(400);
	signedExpect(
		(await page.request.get(`${API}/reports/balance-history?${MARCH}&accountId=nope`)).status(),
	).toBe(400);

	const { other, close } = await otherUserPage(page);
	const spending = await getReport<Spending>(other, `spending-by-category?${MARCH}`);
	signedExpect(spending.categories).toEqual([]);
	const top = await getReport<Spending>(other, `top-categories?${MARCH}`);
	signedExpect(top.categories).toEqual([]);
	const flow = await getReport<IncomeVsExpenses>(other, `income-vs-expenses?${MARCH}`);
	signedExpect(flow.months).toEqual([{ month: "2025-03", income: 0, expenses: 0 }]);
	const trend = await getReport<CashFlowTrend>(other, `cash-flow-trend?${MARCH}`);
	signedExpect(trend.months).toEqual([{ month: "2025-03", net: 0 }]);
	const history = await getReport<BalanceHistory>(other, `balance-history?${MARCH}`);
	signedExpect(history).toMatchObject({ accounts: [], points: [] });
	signedExpect(
		(
			await other.request.get(`${API}/reports/balance-history?${MARCH}&accountId=${bankAccountId}`)
		).status(),
	).toBe(404);
	await close();
});

test("Reports page: range drives the cards and a category opens its transactions", async ({
	page,
}) => {
	await seedMarch(page);
	await page.goto("/reports?range=custom&from=2025-03-01&to=2025-03-31");

	await signedExpect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
	const spending = page.getByRole("region", { name: "Spending by category" });
	await signedExpect(spending.getByRole("button", { name: /Groceries.*\$100\.00/ })).toBeVisible();
	await signedExpect(spending.getByRole("button", { name: /Dining.*\$30\.00/ })).toBeVisible();
	const top = page.getByRole("region", { name: "Top categories" });
	await signedExpect(top.getByRole("button").first()).toContainText("Groceries");
	await signedExpect(
		page.getByRole("figure", { name: "Income vs expenses by month" }),
	).toBeVisible();
	await signedExpect(page.getByRole("figure", { name: "Net cash flow by month" })).toBeVisible();
	// The account was created today, so March 2025 has no balance snapshots yet.
	await signedExpect(
		page
			.getByRole("region", { name: "Account balances over time" })
			.getByText("No balance history in this range."),
	).toBeVisible();

	await spending.getByRole("button", { name: /Groceries/ }).click();
	const drawer = page.getByRole("dialog");
	await signedExpect(drawer.getByRole("heading", { name: "Groceries" })).toBeVisible();
	const feed = drawer.getByRole("list", { name: "Transactions" });
	await signedExpect(feed.getByRole("button", { name: /Market refund/ })).toBeVisible();
	await signedExpect(feed.getByRole("button", { name: /Bistro/ })).toHaveCount(0);

	await feed.getByRole("button", { name: /Market refund/ }).click({ position: { x: 60, y: 12 } });
	await signedExpect(
		page.getByRole("dialog").getByRole("heading", { name: "Market refund" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await signedExpect(
		page.getByRole("dialog").getByRole("heading", { name: "Groceries" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await signedExpect(page.getByRole("dialog")).toHaveCount(0);

	await page.getByLabel("Date range").selectOption({ label: "This Month" });
	await signedExpect(page).toHaveURL(/range=this_month/);
	await signedExpect(page.getByLabel("From")).toHaveCount(0);
	await signedExpect(spending.getByText("No spending in this range.")).toBeVisible();
	await page.goBack();
	await signedExpect(spending.getByRole("button", { name: /Groceries/ })).toBeVisible();
});

test("Reports page: a month bar opens that month's transactions", async ({ page }) => {
	await seedMarch(page);
	await page.goto("/reports?range=custom&from=2025-03-01&to=2025-04-30");

	await page
		.getByRole("figure", { name: "Income vs expenses by month" })
		.getByRole("button", { name: "Show transactions for April 2025" })
		.click();
	const drawer = page.getByRole("dialog");
	await signedExpect(drawer.getByRole("heading", { name: "April 2025" })).toBeVisible();
	const feed = drawer.getByRole("list", { name: "Transactions" });
	await signedExpect(feed.getByRole("button", { name: /April coffee/ })).toBeVisible();
	await signedExpect(feed.getByRole("button", { name: /Bistro/ })).toHaveCount(0);
});
