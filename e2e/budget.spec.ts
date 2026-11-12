import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type Row = {
	id: string | null;
	categoryId: string;
	categoryName: string;
	group: string;
	planned: number;
	actual: number;
	remaining: number;
	percentUsed: number;
};
type Group = {
	key: "income" | "fixed" | "flexible" | "non_monthly";
	planned: number;
	actual: number;
	remaining: number;
	categories: Row[];
};
type BudgetMonth = {
	month: string;
	baseCurrency: string;
	leftToBudget: number;
	groups: Group[];
	unbudgeted: Row[];
	omittedCurrencies: string[];
};
type Budget = { id: string; categoryId: string; month: string; amount: number };

function monthKey(offset: number) {
	const now = new Date();
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
	return date.toISOString().slice(0, 10);
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

async function getBudget(page: Page, monthStart: string) {
	const [year, month] = monthStart.split("-");
	const res = await page.request.get(`${API}/budgets?year=${year}&month=${Number(month)}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: BudgetMonth }).data;
}

async function plan(page: Page, categoryId: string, month: string, amount: number) {
	const res = await page.request.post(`${API}/budgets`, { data: { categoryId, month, amount } });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: Budget }).data;
}

function group(month: BudgetMonth, key: Group["key"]) {
	const found = month.groups.find((row) => row.key === key);
	if (!found) throw new Error(`No group ${key}`);
	return found;
}

/**
 * March 2025 on one checking account: salary +$3,000, rent -$1,500, groceries -$432 with a
 * $32 refund, dining -$50, and a $100 Transfer filed under Groceries that must not count.
 */
async function seedMarch(page: Page) {
	const account = await page.request.post(`${API}/accounts`, {
		data: { name: "Budget Checking", type: "checking", displayGroup: "cash", currentBalance: 0 },
	});
	signedExpect(account.status()).toBe(201);
	const bankAccountId = ((await account.json()) as { data: { id: string } }).data.id;
	const id = await categoryIds(page);
	const rows = [
		{ name: "Paycheck", amount: 300000, category: "Salary" },
		{ name: "Rent", amount: -150000, category: "Housing" },
		{ name: "Market", amount: -43200, category: "Groceries" },
		{ name: "Market refund", amount: 3200, category: "Groceries" },
		{ name: "Bistro", amount: -5000, category: "Dining" },
		{ name: "To savings", amount: -10000, category: "Groceries", transfer: true },
	];
	for (const row of rows) {
		const res = await page.request.post(`${API}/transactions`, {
			data: {
				name: row.name,
				amount: row.amount,
				date: "2025-03-10",
				bankAccountId,
				categoryId: id(row.category),
			},
		});
		signedExpect(res.status()).toBe(201);
		if (row.transfer) {
			const created = ((await res.json()) as { data: { id: string } }).data.id;
			await page.request.patch(`${API}/transactions/${created}`, { data: { tags: ["transfer"] } });
		}
	}
	return id;
}

unsigned("budgets reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/budgets`)).status()).toBe(401);
	expect(
		(
			await request.post(`${API}/budgets`, { data: { categoryId: "x", month: "x", amount: 1 } })
		).status(),
	).toBe(401);
});

test("an empty month has four zero groups and every Category unbudgeted", async ({ page }) => {
	const month = await getBudget(page, "2025-03-01");
	signedExpect(month.month).toBe("2025-03");
	signedExpect(month.baseCurrency).toBe("USD");
	signedExpect(month.leftToBudget).toBe(0);
	signedExpect(month.groups.map(({ key, planned, actual }) => ({ key, planned, actual }))).toEqual([
		{ key: "income", planned: 0, actual: 0 },
		{ key: "fixed", planned: 0, actual: 0 },
		{ key: "flexible", planned: 0, actual: 0 },
		{ key: "non_monthly", planned: 0, actual: 0 },
	]);
	signedExpect(month.groups.every((row) => row.categories.length === 0)).toBe(true);
	const names = month.unbudgeted.map((row) => row.categoryName);
	signedExpect(names).toContain("Salary");
	signedExpect(names).toContain("Groceries");
	signedExpect(month.unbudgeted.every((row) => row.id === null && row.planned === 0)).toBe(true);
});

test("plans roll up with actuals net of refunds, without Transfers", async ({ page }) => {
	const id = await seedMarch(page);
	await plan(page, id("Salary"), "2025-03-01", 350000);
	await plan(page, id("Housing"), "2025-03-01", 140000);
	await plan(page, id("Groceries"), "2025-03-01", 60000);

	const month = await getBudget(page, "2025-03-01");
	signedExpect(month.leftToBudget).toBe(150000);

	const income = group(month, "income");
	signedExpect(income).toMatchObject({ planned: 350000, actual: 300000, remaining: -50000 });
	signedExpect(income.categories).toHaveLength(1);

	const fixed = group(month, "fixed");
	signedExpect(fixed).toMatchObject({ planned: 140000, actual: 150000, remaining: -10000 });
	signedExpect(fixed.categories[0]).toMatchObject({
		categoryName: "Housing",
		planned: 140000,
		actual: 150000,
		remaining: -10000,
	});

	// Group actual counts unplanned spend too (Dining), matching the Dashboard widget.
	const flexible = group(month, "flexible");
	signedExpect(flexible).toMatchObject({ planned: 60000, actual: 45000, remaining: 15000 });
	signedExpect(flexible.categories.map((row) => row.categoryName)).toEqual(["Groceries"]);
	signedExpect(flexible.categories[0]).toMatchObject({ actual: 40000, remaining: 20000 });
	signedExpect(flexible.categories[0]?.percentUsed).toBeCloseTo(40000 / 60000);

	signedExpect(month.unbudgeted[0]).toMatchObject({
		id: null,
		categoryName: "Dining",
		group: "flexible",
		actual: 5000,
		remaining: -5000,
	});
	signedExpect(month.unbudgeted.map((row) => row.categoryName)).not.toContain("Groceries");
});

test("create upserts, patch and delete change one plan; bad input is refused", async ({ page }) => {
	const id = await categoryIds(page);
	const first = await plan(page, id("Dining"), "2025-03-01", 10000);
	const again = await plan(page, id("Dining"), "2025-03-01", 20000);
	signedExpect(again).toMatchObject({ id: first.id, month: "2025-03-01", amount: 20000 });

	const patched = await page.request.patch(`${API}/budgets/${first.id}`, {
		data: { amount: 25000 },
	});
	signedExpect(patched.status()).toBe(200);
	signedExpect(((await patched.json()) as { data: Budget }).data.amount).toBe(25000);
	signedExpect(group(await getBudget(page, "2025-03-01"), "flexible").planned).toBe(25000);

	const removed = await page.request.delete(`${API}/budgets/${first.id}`);
	signedExpect(removed.status()).toBe(200);
	signedExpect(group(await getBudget(page, "2025-03-01"), "flexible").planned).toBe(0);
	signedExpect((await page.request.delete(`${API}/budgets/${first.id}`)).status()).toBe(404);

	for (const data of [
		{ categoryId: id("Dining"), month: "2025-03-15", amount: 100 },
		{ categoryId: id("Dining"), month: "2025-03-01", amount: -1 },
		{ categoryId: id("Dining"), month: "2025-03-01", amount: 1.5 },
		{ categoryId: "nope", month: "2025-03-01", amount: 100 },
	]) {
		signedExpect((await page.request.post(`${API}/budgets`, { data })).status()).toBe(400);
	}
	signedExpect(
		(
			await page.request.post(`${API}/budgets`, {
				data: {
					categoryId: "00000000-0000-4000-8000-000000000000",
					month: "2025-03-01",
					amount: 100,
				},
			})
		).status(),
	).toBe(404);
	signedExpect((await page.request.get(`${API}/budgets?month=13`)).status()).toBe(400);
});

test("another User cannot read, change, or plan on someone else's budget", async ({ page }) => {
	const id = await categoryIds(page);
	const mine = await plan(page, id("Housing"), "2025-03-01", 140000);

	const other = await page.context().browser()?.newContext();
	if (!other) throw new Error("No browser");
	const otherPage = await other.newPage();
	await signUp(otherPage);
	signedExpect(group(await getBudget(otherPage, "2025-03-01"), "fixed").planned).toBe(0);
	signedExpect(
		(await otherPage.request.patch(`${API}/budgets/${mine.id}`, { data: { amount: 1 } })).status(),
	).toBe(404);
	signedExpect((await otherPage.request.delete(`${API}/budgets/${mine.id}`)).status()).toBe(404);
	signedExpect(
		(
			await otherPage.request.post(`${API}/budgets`, {
				data: { categoryId: id("Housing"), month: "2025-03-01", amount: 1 },
			})
		).status(),
	).toBe(404);
	await other.close();

	signedExpect(group(await getBudget(page, "2025-03-01"), "fixed").planned).toBe(140000);
});

test("copy-previous fills unplanned Categories from last month and keeps existing plans", async ({
	page,
}) => {
	const id = await categoryIds(page);
	await plan(page, id("Housing"), "2025-02-01", 140000);
	await plan(page, id("Groceries"), "2025-02-01", 60000);
	await plan(page, id("Groceries"), "2025-03-01", 70000);

	const res = await page.request.post(`${API}/budgets/copy-previous`, {
		data: { targetMonth: "2025-03-01" },
	});
	signedExpect(res.status()).toBe(201);
	const created = ((await res.json()) as { data: Budget[] }).data;
	signedExpect(created.map(({ categoryId, amount }) => ({ categoryId, amount }))).toEqual([
		{ categoryId: id("Housing"), amount: 140000 },
	]);

	const march = await getBudget(page, "2025-03-01");
	signedExpect(group(march, "fixed").planned).toBe(140000);
	signedExpect(group(march, "flexible").planned).toBe(70000);

	const nothing = await page.request.post(`${API}/budgets/copy-previous`, {
		data: { targetMonth: "2025-01-01" },
	});
	signedExpect(((await nothing.json()) as { data: Budget[] }).data).toEqual([]);
	signedExpect(
		(
			await page.request.post(`${API}/budgets/copy-previous`, {
				data: { targetMonth: "2025-01-02" },
			})
		).status(),
	).toBe(400);
});

test("copy-forward fills the current month on open, never a past month", async ({ page }) => {
	const id = await categoryIds(page);
	const earlier = monthKey(-2);
	await plan(page, id("Housing"), earlier, 140000);

	signedExpect(group(await getBudget(page, monthKey(0)), "fixed").planned).toBe(0);

	await page.request.patch(`${API}/settings`, { data: { budgetCopyForward: true } });
	signedExpect(group(await getBudget(page, monthKey(-1)), "fixed").planned).toBe(0);
	signedExpect(group(await getBudget(page, monthKey(0)), "fixed").planned).toBe(140000);
	signedExpect(group(await getBudget(page, monthKey(1)), "fixed").planned).toBe(140000);
});

test("the Dashboard budget widget reads the current month's plans", async ({ page }) => {
	const id = await categoryIds(page);
	await plan(page, id("Groceries"), monthKey(0), 60000);
	const res = await page.request.get(`${API}/dashboard`);
	const budget = (
		(await res.json()) as { data: { budget: { hasBudget: boolean; groups: Group[] } } }
	).data.budget;
	signedExpect(budget.hasBudget).toBe(true);
	signedExpect(budget.groups.find((row) => row.key === "flexible")).toMatchObject({
		planned: 60000,
		spent: 0,
		remaining: 60000,
	});
});

test("Budget page: groups, drawer, unbudgeted, collapse, panel, and copy", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	const id = await seedMarch(page);
	await plan(page, id("Salary"), "2025-03-01", 350000);
	await plan(page, id("Housing"), "2025-03-01", 140000);
	await plan(page, id("Groceries"), "2025-03-01", 60000);
	await plan(page, id("Transport"), "2025-02-01", 9000);
	await page.goto("/budget?month=2025-03");

	await signedExpect(page.getByRole("heading", { name: "Budget", level: 1 })).toBeVisible();
	await signedExpect(page.getByText("March 2025")).toBeVisible();
	const main = page.getByRole("main");
	await signedExpect(main.getByRole("region", { name: "Income" })).toContainText("$3,500.00");

	const housing = main.getByRole("button", { name: /Housing/ });
	await signedExpect(housing).toContainText("$1,400.00");
	await signedExpect(housing).toContainText("$1,500.00");
	await signedExpect(housing.getByText("-$100.00")).toHaveClass(/text-negative/);

	const panel = page.getByRole("complementary", { name: "Summary" });
	const leftToBudget = panel.getByRole("status", { name: "Left to budget" });
	await signedExpect(leftToBudget).toContainText("$1,500.00");
	await signedExpect(leftToBudget).toContainText("Left to budget");

	await main.getByRole("button", { name: /Groceries/ }).click();
	const drawer = page.getByRole("dialog", { name: "Groceries" });
	await drawer.getByLabel("Planned").fill("700");
	await drawer.getByRole("button", { name: "Save" }).click();
	await signedExpect(page.getByText("Budget saved")).toBeVisible();
	await signedExpect(drawer).toHaveCount(0);
	await signedExpect(main.getByRole("button", { name: /Groceries/ })).toContainText("$700.00");
	await signedExpect(leftToBudget).toContainText("$1,400.00");

	await signedExpect(main.getByRole("button", { name: /Dining/ })).toHaveCount(0);
	await main.getByRole("button", { name: "Show unbudgeted" }).click();
	await main.getByRole("button", { name: /Dining/ }).click();
	await page.getByRole("dialog", { name: "Dining" }).getByLabel("Planned").fill("80");
	await page.getByRole("dialog", { name: "Dining" }).getByRole("button", { name: "Save" }).click();
	await signedExpect(page.getByRole("dialog")).toHaveCount(0);
	await main.getByRole("button", { name: "Hide unbudgeted" }).click();
	await signedExpect(main.getByRole("button", { name: /Dining/ })).toContainText("$80.00");

	await main.getByRole("button", { name: /Fixed/, expanded: true }).click();
	await signedExpect(main.getByRole("button", { name: /Housing/ })).toHaveCount(0);
	await main.getByRole("button", { name: /Fixed/, expanded: false }).click();
	await signedExpect(main.getByRole("button", { name: /Housing/ })).toBeVisible();

	await page.getByRole("button", { name: "Budget settings" }).click();
	await page.getByRole("menuitem", { name: "Copy from previous month" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Copy" }).click();
	await signedExpect(page.getByText("Copied 1 plan from February")).toBeVisible();
	await signedExpect(main.getByRole("button", { name: /Transport/ })).toContainText("$90.00");

	await page.getByRole("button", { name: "Budget settings" }).click();
	await page.getByRole("menuitemcheckbox", { name: "Copy forward each month" }).click();
	await signedExpect(page.getByText("Copy forward on")).toBeVisible();
	const settings = await page.request.get(`${API}/settings`);
	signedExpect(
		((await settings.json()) as { data: { budgetCopyForward: boolean } }).data.budgetCopyForward,
	).toBe(true);

	await page.getByRole("button", { name: "Next month" }).click();
	await signedExpect(page).toHaveURL(/month=2025-04/);
	await signedExpect(page.getByText("April 2025")).toBeVisible();
	await signedExpect(main.getByRole("button", { name: /Housing/ })).toHaveCount(0);
});
