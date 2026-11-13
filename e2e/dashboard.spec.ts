import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";

const API = "http://localhost:3000/api";
const DEFAULT_ORDER = ["budget", "net_worth", "spending", "transactions", "recurring"];

type Widget = { id: string; visible: boolean; order: number };
type Dashboard = {
	month: string;
	baseCurrency: string;
	greetingName: string;
	hasAccounts: boolean;
	widgets: Widget[];
	budget: { hasBudget: boolean; groups: { key: string; spent: number; planned: number }[] } | null;
	netWorth: { current: number; range: string } | null;
	spending: {
		total: number;
		thisMonth: { day: number; amount: number }[];
		lastMonth: { day: number; amount: number }[];
	} | null;
	transactions: { name: string }[] | null;
	recurring: { remainingDue: number; upcoming: unknown[] } | null;
};

function todayUtc() {
	return new Date().toISOString().slice(0, 10);
}

async function getDashboard(page: Page, query = "") {
	const res = await page.request.get(`${API}/dashboard${query}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Dashboard }).data;
}

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = rows.find((row) => row.name === name);
	if (!found) throw new Error(`No category ${name}`);
	return found.id;
}

/** One checking account ($2,000) and spending dated today, so it lands in the current month. */
async function seedToday(page: Page) {
	const account = await page.request.post(`${API}/accounts`, {
		data: { name: "Home Checking", type: "checking", displayGroup: "cash", currentBalance: 200000 },
	});
	signedExpect(account.status()).toBe(201);
	const bankAccountId = ((await account.json()) as { data: { id: string } }).data.id;
	const date = todayUtc();
	const rows: { name: string; amount: number; category: string; transfer?: boolean }[] = [
		{ name: "Rent", amount: -150000, category: "Housing" },
		{ name: "Market", amount: -8000, category: "Groceries" },
		{ name: "Market refund", amount: 1000, category: "Groceries" },
		{ name: "Paycheck", amount: 300000, category: "Salary" },
		{ name: "To savings", amount: -5000, category: "Education", transfer: true },
	];
	for (const row of rows) {
		const res = await page.request.post(`${API}/transactions`, {
			data: {
				name: row.name,
				amount: row.amount,
				date,
				bankAccountId,
				categoryId: await categoryId(page, row.category),
			},
		});
		signedExpect(res.status()).toBe(201);
		if (row.transfer) {
			const id = ((await res.json()) as { data: { id: string } }).data.id;
			await page.request.patch(`${API}/transactions/${id}`, { data: { tags: ["transfer"] } });
		}
	}
}

unsigned("dashboard and settings reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/dashboard`)).status()).toBe(401);
	expect((await request.get(`${API}/settings`)).status()).toBe(401);
	expect((await request.patch(`${API}/settings`, { data: {} })).status()).toBe(401);
});

test("settings default to five visible widgets and normalize what is saved", async ({ page }) => {
	const initial = await page.request.get(`${API}/settings`);
	const settings = (
		(await initial.json()) as { data: { currency: string; dashboardWidgets: Widget[] } }
	).data;
	signedExpect(settings.currency).toBe("USD");
	signedExpect(settings.dashboardWidgets.map((widget) => widget.id)).toEqual(DEFAULT_ORDER);
	signedExpect(settings.dashboardWidgets.every((widget) => widget.visible)).toBe(true);

	// Two widgets sent: the rest come back visible at the end, renumbered from 0.
	const saved = await page.request.patch(`${API}/settings`, {
		data: {
			dashboardWidgets: [
				{ id: "recurring", visible: true, order: 0 },
				{ id: "spending", visible: false, order: 1 },
			],
		},
	});
	signedExpect(saved.status()).toBe(200);
	const widgets = ((await saved.json()) as { data: { dashboardWidgets: Widget[] } }).data
		.dashboardWidgets;
	signedExpect(widgets).toEqual([
		{ id: "recurring", visible: true, order: 0 },
		{ id: "spending", visible: false, order: 1 },
		{ id: "budget", visible: true, order: 2 },
		{ id: "net_worth", visible: true, order: 3 },
		{ id: "transactions", visible: true, order: 4 },
	]);

	for (const data of [
		{ dashboardWidgets: [{ id: "advice", visible: true, order: 0 }] },
		{ currency: "BTC" },
		{ currency: "usd" },
		{ rollover: true },
	]) {
		signedExpect((await page.request.patch(`${API}/settings`, { data })).status()).toBe(400);
	}
});

test("dashboard payload rolls up budget groups, spending, and recent transactions", async ({
	page,
}) => {
	const empty = await getDashboard(page);
	signedExpect(empty.hasAccounts).toBe(false);
	signedExpect(empty.greetingName).toBe("Gabriel");

	await seedToday(page);
	const data = await getDashboard(page);
	signedExpect(data.hasAccounts).toBe(true);
	signedExpect(data.month).toBe(todayUtc().slice(0, 7));
	signedExpect(data.baseCurrency).toBe("USD");

	// Refunds net against their group; income and Transfers stay out.
	signedExpect(data.budget?.hasBudget).toBe(false);
	signedExpect(
		data.budget?.groups.map(({ key, spent, planned }) => ({ key, spent, planned })),
	).toEqual([
		{ key: "fixed", spent: 150000, planned: 0 },
		{ key: "flexible", spent: 7000, planned: 0 },
		{ key: "non_monthly", spent: 0, planned: 0 },
	]);

	// Spending is gross outflow without Transfers, as a running total to today.
	const today = Number(todayUtc().slice(8, 10));
	signedExpect(data.spending?.total).toBe(158000);
	signedExpect(data.spending?.thisMonth).toHaveLength(today);
	signedExpect(data.spending?.thisMonth.at(-1)).toEqual({ day: today, amount: 158000 });
	signedExpect(data.spending?.lastMonth.at(-1)?.amount).toBe(0);

	signedExpect(data.netWorth).toMatchObject({ current: 200000, range: "1m" });
	signedExpect(data.transactions?.map((row) => row.name).sort()).toEqual(
		["Market", "Market refund", "Paycheck", "Rent", "To savings"].sort(),
	);
	signedExpect(data.recurring).toEqual({ remainingDue: 0, upcoming: [] });

	signedExpect((await getDashboard(page, "?netWorthRange=1y")).netWorth?.range).toBe("1y");
	signedExpect((await page.request.get(`${API}/dashboard?netWorthRange=5y`)).status()).toBe(400);

	await page.request.patch(`${API}/settings`, {
		data: { dashboardWidgets: [{ id: "spending", visible: false, order: 0 }] },
	});
	const trimmed = await getDashboard(page);
	signedExpect(trimmed.spending).toBeNull();
	signedExpect(trimmed.budget).not.toBeNull();
});

test("Dashboard page: widgets, deep links, drawer, and Customize persists", async ({ page }) => {
	// Below 1280px the grid is one column, so DOM order is the saved widget order.
	await page.setViewportSize({ width: 1024, height: 900 });
	await page.goto("/");
	await signedExpect(page.getByRole("heading", { name: "Connect an account" })).toBeVisible();

	await seedToday(page);
	await page.reload();
	const main = page.getByRole("main");
	const widgetHeadings = main.getByRole("region").getByRole("heading", { level: 2 });
	await signedExpect(widgetHeadings).toHaveText([
		"Budget",
		"Net worth",
		"Spending",
		"Transactions",
		"Recurring",
	]);
	await signedExpect(main.getByRole("region", { name: "Spending" })).toContainText("$1,580.00");
	await signedExpect(main.getByRole("region", { name: "Budget" })).toContainText("$1,500.00 spent");
	await signedExpect(main.getByRole("region", { name: "Net worth" })).toContainText("$2,000.00");
	await signedExpect(main.getByRole("region", { name: "Recurring" })).toContainText(
		"No recurring bills yet.",
	);

	await page
		.getByRole("list", { name: "Recent transactions" })
		.getByRole("button", { name: /Rent/ })
		.click();
	await signedExpect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await signedExpect(page.getByRole("dialog")).toHaveCount(0);

	await page.getByRole("button", { name: "Customize" }).click();
	const drawer = page.getByRole("dialog", { name: "Customize dashboard" });
	await drawer.getByRole("checkbox", { name: "Spending" }).uncheck();
	await drawer.getByRole("button", { name: "Move Recurring up" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await signedExpect(drawer).toHaveCount(0);
	await signedExpect(widgetHeadings).toHaveText([
		"Budget",
		"Net worth",
		"Recurring",
		"Transactions",
	]);

	await page.reload();
	await signedExpect(widgetHeadings).toHaveText([
		"Budget",
		"Net worth",
		"Recurring",
		"Transactions",
	]);

	await main.getByRole("link", { name: "Budget", exact: true }).click();
	await signedExpect(page).toHaveURL("/budget");
});
