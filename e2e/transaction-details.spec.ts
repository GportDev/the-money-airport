import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { chooseOption } from "./helpers/select";

const API = "http://localhost:3000/api";

type Item = {
	id: string;
	name: string;
	merchantName: string | null;
	amount: number;
	pending: boolean;
	tags: string[];
	isRefund: boolean;
	category: { id: string; name: string } | null;
};
type Detail = Item & {
	refund: { of: Item | null; refundedBy: Item[] };
};
type Category = { id: string; name: string; kind: string };

async function connectFakeBank(page: Page) {
	await page.request.post(`${API}/plaid/create-link-token`);
	const exchanged = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	expect(exchanged.status()).toBe(200);
	return ((await exchanged.json()) as { data: { item: { id: string } } }).data.item.id;
}

async function listAll(page: Page) {
	const res = await page.request.get(`${API}/transactions?limit=200`);
	return ((await res.json()) as { data: Item[] }).data;
}

async function detail(page: Page, id: string) {
	const res = await page.request.get(`${API}/transactions/${id}`);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: Detail }).data;
}

async function categories(page: Page) {
	const res = await page.request.get(`${API}/categories`);
	return ((await res.json()) as { data: Category[] }).data;
}

async function categoryId(page: Page, name: string) {
	const found = (await categories(page)).find((row) => row.name === name);
	if (!found) throw new Error(`No category ${name}`);
	return found.id;
}

function byName(items: Item[], name: string) {
	const found = items.find((item) => (item.merchantName ?? item.name) === name);
	if (!found) throw new Error(`No transaction named ${name}`);
	return found;
}

async function addManual(page: Page, name: string, amount: number, category?: string) {
	const res = await page.request.post(`${API}/transactions`, {
		data: {
			name,
			amount,
			date: new Date().toISOString().slice(0, 10),
			categoryId: category ? await categoryId(page, category) : null,
		},
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Detail }).data;
}

function feedRow(page: Page, name: RegExp) {
	return page.getByRole("list", { name: "Transactions" }).getByRole("button", { name });
}

/** Clicks the row clear of its Category picker, which sits over the row's middle. */
async function openRow(page: Page, name: RegExp) {
	await feedRow(page, name).click({ position: { x: 60, y: 12 } });
}

test("signup seeds a Transfer category of kind transfer", async ({ page }) => {
	const transfer = (await categories(page)).find((row) => row.name === "Transfer");
	expect(transfer?.kind).toBe("transfer");
});

test("a transfer category marks a transaction as a Transfer and leaving it unmarks it", async ({
	page,
}) => {
	const created = await addManual(page, "Move to savings", -5000, "Groceries");
	await page.goto("/transactions");
	await page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Move to savings" })
		.click();
	await expect(page.getByText("Transfers", { exact: true })).toBeVisible();
	await page.getByRole("option", { name: "Transfer", exact: true }).click();
	await expect.poll(async () => (await detail(page, created.id)).tags).toEqual(["transfer"]);
	await expect(page.getByRole("checkbox", { name: "This is a transfer" })).toHaveCount(0);

	await page.request.patch(`${API}/transactions/${created.id}`, {
		data: { categoryId: await categoryId(page, "Dining") },
	});
	expect((await detail(page, created.id)).tags).toEqual([]);

	const direct = await addManual(page, "Card payment", -9000, "Transfer");
	expect(direct.tags).toEqual(["transfer"]);

	const budget = await page.request.get(`${API}/budgets?year=2025&month=3`);
	const month = (await budget.json()) as {
		data: { unbudgeted: { categoryName: string }[] };
	};
	expect(month.data.unbudgeted.map((row) => row.categoryName)).not.toContain("Transfer");
});

test("the category manager creates a Transfer-kind category", async ({ page }) => {
	await page.goto("/transactions");
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Manage categories" }).click();
	const manager = page.getByRole("dialog");
	await expect(manager.getByRole("heading", { name: "Transfer", exact: true })).toBeVisible();
	await manager.getByRole("button", { name: "New category" }).click();
	await manager.getByLabel("Name").fill("Card payment");
	await chooseOption(page, manager.getByLabel("Kind"), "Transfer");
	await expect(manager.getByLabel("Budget group")).toHaveCount(0);
	await manager.getByRole("button", { name: "Create category" }).click();
	await expect
		.poll(async () => (await categories(page)).find((row) => row.name === "Card payment")?.kind)
		.toBe("transfer");
});

test("a synced transaction can be renamed and given a merchant, and sync keeps both", async ({
	page,
}) => {
	const itemId = await connectFakeBank(page);
	const amazon = byName(await listAll(page), "Amazon");
	expect(amazon.pending).toBe(true);

	await page.goto("/transactions");
	await openRow(page, /^Amazon/);
	const drawer = page.getByRole("dialog");
	await drawer.getByLabel("Name").fill("Prime renewal");
	await drawer.getByLabel("Name").press("Enter");
	await expect.poll(async () => (await detail(page, amazon.id)).name).toBe("Prime renewal");
	await drawer.getByLabel("Merchant").click();
	await page.getByRole("combobox", { name: "Search merchants" }).fill("Amazon Prime");
	await page.getByRole("option", { name: "Add “Amazon Prime”" }).click();
	await expect.poll(async () => (await detail(page, amazon.id)).merchantName).toBe("Amazon Prime");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);

	const sync = await page.request.post(`${API}/plaid/sync/${itemId}`);
	expect(sync.status()).toBe(200);
	const after = await detail(page, amazon.id);
	expect(after.pending).toBe(false);
	expect(after.name).toBe("Prime renewal");
	expect(after.merchantName).toBe("Amazon Prime");
});

test("the merchant picker lists merchants the User already has", async ({ page }) => {
	await connectFakeBank(page);
	const ach = byName(await listAll(page), "ACH DEBIT 0042");
	const merchants = await page.request.get(`${API}/transactions/merchants`);
	const names = ((await merchants.json()) as { data: { name: string }[] }).data.map(
		(row) => row.name,
	);
	expect(names).toEqual(expect.arrayContaining(["Uber", "Whole Foods", "Joe Coffee"]));

	await page.goto("/transactions");
	await openRow(page, /^ACH DEBIT 0042/);
	const drawer = page.getByRole("dialog");
	await drawer.getByLabel("Merchant").click();
	await page.getByRole("combobox", { name: "Search merchants" }).fill("Ube");
	await page.getByRole("option", { name: "Uber", exact: true }).click();
	await expect.poll(async () => (await detail(page, ach.id)).merchantName).toBe("Uber");
});

test("money back can be linked as the refund of an expense", async ({ page }) => {
	const expense = await addManual(page, "Shoe Store", -8000, "Shopping");
	const refund = await addManual(page, "Shoe Store", 8000);

	await page.goto("/transactions");
	await openRow(page, /Shoe Store.*\+\$80\.00/);
	const drawer = page.getByRole("dialog");
	await drawer.getByRole("button", { name: "Mark as refund" }).click();
	await drawer
		.getByRole("list", { name: "Expenses this may refund" })
		.getByRole("button", { name: /Shoe Store/ })
		.click();
	await expect(page.getByText("Linked as a refund of Shoe Store")).toBeVisible();
	await expect(drawer.getByRole("heading", { name: "Refund of" })).toBeVisible();

	const linked = await detail(page, refund.id);
	expect(linked.refund.of?.id).toBe(expense.id);
	expect(linked.isRefund).toBe(true);
	expect(linked.category?.name).toBe("Shopping");
	const original = await detail(page, expense.id);
	expect(original.refund.refundedBy.map((row) => row.id)).toEqual([refund.id]);

	await page.keyboard.press("Escape");
	await expect(feedRow(page, /Shoe Store, Refund/)).toBeVisible();

	const wrongWay = await page.request.put(`${API}/transactions/${expense.id}/refund`, {
		data: { originalId: refund.id },
	});
	expect(wrongWay.status()).toBe(400);
});

test("a rule files every matching transaction and the transactions that sync later", async ({
	page,
}) => {
	const small = await addManual(page, "Corner Store", -500);
	const large = await addManual(page, "Corner Store", -700);

	await page.goto("/transactions");
	await openRow(page, /Corner Store.*-\$5\.00/);
	const drawer = page.getByRole("dialog");
	await drawer.getByRole("button", { name: "Create rule" }).click();
	await drawer.getByLabel("Always put Corner Store in").click();
	await page.getByRole("option", { name: "Groceries" }).click();
	await drawer.getByRole("button", { name: "Save rule" }).click();
	await expect(page.getByText("Rule saved. 2 transactions updated.")).toBeVisible();
	expect((await detail(page, small.id)).category?.name).toBe("Groceries");
	expect((await detail(page, large.id)).category?.name).toBe("Groceries");

	const exact = await page.request.post(`${API}/transaction-rules`, {
		data: { merchant: "corner store", amount: -700, categoryId: await categoryId(page, "Dining") },
	});
	expect(((await exact.json()) as { data: { applied: number } }).data.applied).toBe(1);
	expect((await detail(page, small.id)).category?.name).toBe("Groceries");
	expect((await detail(page, large.id)).category?.name).toBe("Dining");

	await page.request.post(`${API}/transaction-rules`, {
		data: { merchant: "Joe Coffee", amount: null, categoryId: await categoryId(page, "Shopping") },
	});
	await connectFakeBank(page);
	expect(byName(await listAll(page), "Joe Coffee").category?.name).toBe("Shopping");

	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Manage rules" }).click();
	const rules = page.getByRole("dialog");
	await expect(rules.getByText("Joe Coffee")).toBeVisible();
	await rules.getByRole("button", { name: "Delete rule for Joe Coffee" }).click();
	await expect(page.getByText("Rule deleted")).toBeVisible();
	await expect(rules.getByText("Joe Coffee")).toHaveCount(0);
});

test("the drawer shows status, account, and best card, and hides default split and refund", async ({
	page,
}) => {
	await connectFakeBank(page);
	await page.goto("/transactions");
	await openRow(page, /^Amazon/);
	const drawer = page.getByRole("dialog");
	await expect(drawer.getByText("Pending", { exact: true })).toBeVisible();
	const details = drawer.getByLabel("Details", { exact: true });
	await expect(details).toContainText("Plaid Credit Card");
	await expect(details).not.toContainText("Not split");
	await expect(details).not.toContainText("Refund");
});

test("refunds, rules, and merchants stay with their own User", async ({ page, browser }) => {
	const expense = await addManual(page, "Private Shop", -1000);
	const refund = await addManual(page, "Private Shop", 1000);
	const saved = await page.request.post(`${API}/transaction-rules`, {
		data: { merchant: "Private Shop", amount: null, categoryId: await categoryId(page, "Dining") },
	});
	expect(saved.status()).toBe(201);
	const rules = await page.request.get(`${API}/transaction-rules`);
	const ruleId = ((await rules.json()) as { data: { id: string }[] }).data[0]?.id;

	const other = await browser.newPage();
	await signUp(other);
	expect(
		(
			await other.request.put(`${API}/transactions/${refund.id}/refund`, {
				data: { originalId: expense.id },
			})
		).status(),
	).toBe(404);
	expect(
		(await other.request.get(`${API}/transactions/${refund.id}/refund-candidates`)).status(),
	).toBe(404);
	expect((await other.request.delete(`${API}/transaction-rules/${ruleId}`)).status()).toBe(404);
	const otherRules = await other.request.get(`${API}/transaction-rules`);
	expect(((await otherRules.json()) as { data: unknown[] }).data).toEqual([]);
	const otherMerchants = await other.request.get(`${API}/transactions/merchants`);
	expect(((await otherMerchants.json()) as { data: unknown[] }).data).toEqual([]);
	await other.close();

	expect((await page.request.get(`${API}/transaction-rules`)).status()).toBe(200);
});

test("a feed row gets a merchant and a new name without opening the drawer", async ({ page }) => {
	const tip = await addManual(page, "Cash tip", -1200);
	const coffee = await addManual(page, "CARD 4411 JOE", -450);

	await page.goto("/transactions");
	const feed = page.getByRole("list", { name: "Transactions" });

	const tipRow = feed.getByRole("listitem").filter({ hasText: "Cash tip" });
	await tipRow.hover();
	await tipRow.getByRole("button", { name: "Edit name or merchant" }).click();
	const editor = page.getByRole("combobox", { name: "Merchant or name" });
	await editor.fill("Valet tip");
	await editor.press("Enter");
	await expect.poll(async () => (await detail(page, tip.id)).name).toBe("Valet tip");
	await expect(page.getByRole("dialog")).toHaveCount(0);

	const coffeeRow = feed.getByRole("listitem").filter({ hasText: "CARD 4411 JOE" });
	await coffeeRow.hover();
	await coffeeRow.getByRole("button", { name: "Edit name or merchant" }).click();
	await page.getByRole("combobox", { name: "Merchant or name" }).fill("Joe Coffee");
	await page.getByRole("option", { name: "Add “Joe Coffee” as merchant" }).click();
	await expect.poll(async () => (await detail(page, coffee.id)).merchantName).toBe("Joe Coffee");
	await expect(feed.getByRole("listitem").filter({ hasText: "Joe Coffee" })).toContainText(
		"CARD 4411 JOE",
	);
});

test("Escape leaves a feed row's title unchanged", async ({ page }) => {
	const row = await addManual(page, "Bakery", -300);
	await page.goto("/transactions");
	const item = page
		.getByRole("list", { name: "Transactions" })
		.getByRole("listitem")
		.filter({ hasText: "Bakery" });
	await item.hover();
	await item.getByRole("button", { name: "Edit name or merchant" }).click();
	const editor = page.getByRole("combobox", { name: "Merchant or name" });
	await editor.fill("Something else");
	await editor.press("Escape");
	await expect(editor).toHaveCount(0);
	expect((await detail(page, row.id)).name).toBe("Bakery");
});
