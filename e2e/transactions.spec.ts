import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type Item = {
	id: string;
	name: string;
	merchantName: string | null;
	amount: number;
	pending: boolean;
	isManual: boolean;
	tags: string[];
	category: { id: string; name: string } | null;
	account: { id: string; name: string } | null;
};
type Category = { id: string; name: string; kind: string; isUncategorized: boolean };

async function connectFakeBank(page: Page) {
	await page.request.post(`${API}/plaid/create-link-token`);
	const exchanged = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	signedExpect(exchanged.status()).toBe(200);
	const body = (await exchanged.json()) as { data: { item: { id: string } } };
	return body.data.item.id;
}

async function listAll(page: Page, query = "") {
	const res = await page.request.get(`${API}/transactions?limit=200${query}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Item[] }).data;
}

async function categories(page: Page) {
	const res = await page.request.get(`${API}/categories`);
	return ((await res.json()) as { data: Category[] }).data;
}

function byName(items: Item[], name: string) {
	const found = items.find((item) => (item.merchantName ?? item.name) === name);
	if (!found) throw new Error(`No transaction named ${name}`);
	return found;
}

unsigned(
	"transactions and categories APIs reject an unauthenticated request",
	async ({ request }) => {
		expect((await request.get(`${API}/transactions`)).status()).toBe(401);
		expect((await request.get(`${API}/categories`)).status()).toBe(401);
		expect(
			(
				await request.patch(`${API}/transactions/bulk-categorize`, {
					data: { transactionIds: [], categoryId: "x" },
				})
			).status(),
		).toBe(401);
	},
);

test("signup seeds default Categories with one Uncategorized", async ({ page }) => {
	const rows = await categories(page);
	const names = rows.map((row) => row.name);
	for (const name of [
		"Housing",
		"Groceries",
		"Dining",
		"Salary",
		"Savings Transfer",
		"Uncategorized",
	]) {
		signedExpect(names).toContain(name);
	}
	signedExpect(rows.filter((row) => row.isUncategorized)).toHaveLength(1);
	signedExpect(rows.find((row) => row.name === "Salary")?.kind).toBe("income");
});

test("connecting a bank imports, signs, categorizes, and pairs transactions", async ({ page }) => {
	await connectFakeBank(page);
	const items = await listAll(page);
	signedExpect(items).toHaveLength(8);

	signedExpect(byName(items, "Joe Coffee").amount).toBe(-475);
	signedExpect(byName(items, "Joe Coffee").category?.name).toBe("Dining");
	signedExpect(byName(items, "Whole Foods").category?.name).toBe("Groceries");
	signedExpect(byName(items, "ACME").amount).toBe(350000);
	signedExpect(byName(items, "ACME").category?.name).toBe("Salary");
	signedExpect(byName(items, "ACH DEBIT 0042").category?.name).toBe("Uncategorized");
	signedExpect(byName(items, "Amazon").pending).toBe(true);

	const paymentOut = byName(items, "Payment to Plaid Credit Card");
	const paymentIn = byName(items, "Payment received, thank you");
	signedExpect(paymentOut.tags).toEqual(["transfer"]);
	signedExpect(paymentIn.tags).toEqual(["transfer"]);
	signedExpect(byName(items, "Joe Coffee").tags).toEqual([]);

	// Newest first.
	const dates = items.map((item) => (item as unknown as { date: string }).date);
	signedExpect([...dates].sort().reverse()).toEqual(dates);
});

test("pending to posted keeps the User's Category and notes; sync never overwrites a choice", async ({
	page,
}) => {
	const itemId = await connectFakeBank(page);
	const before = await listAll(page);
	const pending = byName(before, "Amazon");
	const coffee = byName(before, "Joe Coffee");
	const subscriptions = (await categories(page)).find((row) => row.name === "Subscriptions");
	if (!subscriptions) throw new Error("Subscriptions missing");

	signedExpect(
		(
			await page.request.patch(`${API}/transactions/${pending.id}`, {
				data: { categoryId: subscriptions.id, notes: "Prime renewal" },
			})
		).status(),
	).toBe(200);
	await page.request.patch(`${API}/transactions/${coffee.id}`, {
		data: { categoryId: subscriptions.id },
	});

	const sync = await page.request.post(`${API}/plaid/sync/${itemId}`);
	signedExpect(sync.status()).toBe(200);
	const syncBody = (await sync.json()) as { data: { modified: number } };
	signedExpect(syncBody.data.modified).toBe(1);

	const after = await listAll(page);
	signedExpect(after).toHaveLength(8);
	const amazon = after.filter((item) => item.merchantName === "Amazon");
	signedExpect(amazon).toHaveLength(1);
	signedExpect(amazon[0]?.id).toBe(pending.id);
	signedExpect(amazon[0]?.pending).toBe(false);
	signedExpect(amazon[0]?.category?.name).toBe("Subscriptions");
	const detail = await page.request.get(`${API}/transactions/${pending.id}`);
	signedExpect(((await detail.json()) as { data: { notes: string } }).data.notes).toBe(
		"Prime renewal",
	);
	signedExpect(byName(after, "Joe Coffee").category?.name).toBe("Subscriptions");
});

test("feed paginates with an opaque cursor and filters by account, category, search, pending", async ({
	page,
}) => {
	await connectFakeBank(page);
	const seen = new Set<string>();
	let cursor: string | null = null;
	let pages = 0;
	do {
		const res = await page.request.get(
			`${API}/transactions?limit=3${cursor ? `&cursor=${cursor}` : ""}`,
		);
		const body = (await res.json()) as { data: Item[]; meta: { nextCursor: string | null } };
		signedExpect(body.data.length).toBeLessThanOrEqual(3);
		for (const item of body.data) seen.add(item.id);
		cursor = body.meta.nextCursor;
		pages += 1;
	} while (cursor && pages < 10);
	signedExpect(seen.size).toBe(8);
	signedExpect(pages).toBe(3);

	const all = await listAll(page);
	const credit = byName(all, "Uber").account;
	if (!credit) throw new Error("Uber has no account");
	const onCard = await listAll(page, `&accountId=${credit.id}`);
	signedExpect(onCard.map((item) => item.merchantName ?? item.name).sort()).toEqual(
		["Amazon", "Payment received, thank you", "Uber"].sort(),
	);

	const dining = byName(all, "Joe Coffee").category;
	const groceries = byName(all, "Whole Foods").category;
	const twoCategories = await listAll(
		page,
		`&categoryId=${dining?.id}&categoryId=${groceries?.id}`,
	);
	signedExpect(twoCategories).toHaveLength(2);

	signedExpect(await listAll(page, "&search=coffee")).toHaveLength(1);
	signedExpect(await listAll(page, "&pending=true")).toHaveLength(1);
	signedExpect(await listAll(page, "&amountMin=40000")).toHaveLength(3);

	const bad = await page.request.get(`${API}/transactions?cursor=not-a-cursor`);
	signedExpect(bad.status()).toBe(400);
});

test("bulk categorize, category delete reassignment, and Uncategorized protection", async ({
	page,
}) => {
	await connectFakeBank(page);
	const all = await listAll(page);
	const rows = await categories(page);
	const shopping = rows.find((row) => row.name === "Shopping");
	const uncategorized = rows.find((row) => row.isUncategorized);
	if (!shopping || !uncategorized) throw new Error("seed missing");

	const ids = [byName(all, "Uber").id, byName(all, "ACH DEBIT 0042").id];
	const bulk = await page.request.patch(`${API}/transactions/bulk-categorize`, {
		data: { transactionIds: ids, categoryId: shopping.id },
	});
	signedExpect(await bulk.json()).toEqual({ data: { updated: 2 } });

	signedExpect((await page.request.delete(`${API}/categories/${shopping.id}`)).status()).toBe(200);
	const after = await listAll(page);
	signedExpect(byName(after, "Uber").category?.name).toBe("Uncategorized");
	signedExpect(byName(after, "Amazon").category?.name).toBe("Uncategorized");

	signedExpect((await page.request.delete(`${API}/categories/${uncategorized.id}`)).status()).toBe(
		400,
	);

	const created = await page.request.post(`${API}/categories`, {
		data: { name: "Pets", color: "#123456", icon: "paw-print", kind: "expense" },
	});
	signedExpect(created.status()).toBe(201);
	const duplicate = await page.request.post(`${API}/categories`, {
		data: { name: "Pets", color: "#123456", icon: "paw-print", kind: "expense" },
	});
	signedExpect(duplicate.status()).toBe(400);
});

test("manual transactions can be added, edited, and deleted; Plaid rows keep their ledger", async ({
	page,
}) => {
	await connectFakeBank(page);
	const created = await page.request.post(`${API}/transactions`, {
		data: { name: "Farmers market", amount: -2200, date: "2026-11-01" },
	});
	signedExpect(created.status()).toBe(201);
	const manual = ((await created.json()) as { data: Item & { isoCurrencyCode: string } }).data;
	signedExpect(manual.isManual).toBe(true);
	signedExpect(manual.category?.name).toBe("Uncategorized");
	signedExpect(manual.isoCurrencyCode).toBe("USD");

	const edited = await page.request.patch(`${API}/transactions/${manual.id}`, {
		data: { amount: -2500, tags: ["transfer"] },
	});
	const editedBody = (await edited.json()) as { data: Item };
	signedExpect(editedBody.data.amount).toBe(-2500);
	signedExpect(editedBody.data.tags).toEqual(["transfer"]);

	const plaidRow = byName(await listAll(page), "Joe Coffee");
	const rename = await page.request.patch(`${API}/transactions/${plaidRow.id}`, {
		data: { name: "Not allowed" },
	});
	signedExpect(rename.status()).toBe(400);
	signedExpect((await page.request.delete(`${API}/transactions/${plaidRow.id}`)).status()).toBe(
		400,
	);

	signedExpect((await page.request.delete(`${API}/transactions/${manual.id}`)).status()).toBe(200);
	signedExpect(await listAll(page)).toHaveLength(8);
});

test("one User cannot read or edit another User's transactions", async ({ page, browser }) => {
	await connectFakeBank(page);
	const mine = byName(await listAll(page), "Joe Coffee");

	const otherContext = await browser.newContext({ baseURL: "http://localhost:5173" });
	const other = await otherContext.newPage();
	await signUp(other);
	signedExpect((await other.request.get(`${API}/transactions/${mine.id}`)).status()).toBe(404);
	const theirs = (await categories(other))[0];
	const patch = await other.request.patch(`${API}/transactions/${mine.id}`, {
		data: { categoryId: theirs?.id },
	});
	signedExpect(patch.status()).toBe(404);
	const bulk = await other.request.patch(`${API}/transactions/bulk-categorize`, {
		data: { transactionIds: [mine.id], categoryId: theirs?.id },
	});
	signedExpect(await bulk.json()).toEqual({ data: { updated: 0 } });
	signedExpect(await listAll(other)).toHaveLength(0);
	await otherContext.close();
});

test("Transactions page: date-grouped feed, drawer edit, filters, and Edit multiple", async ({
	page,
}) => {
	await connectFakeBank(page);
	await page.goto("/transactions");
	await signedExpect(page.getByRole("heading", { name: "Transactions", level: 1 })).toBeVisible();
	const feed = page.getByRole("list", { name: "Transactions" });
	await signedExpect(feed.getByRole("button", { name: /Joe Coffee/ })).toBeVisible();
	await signedExpect(feed.getByRole("heading", { level: 2 }).first()).toBeVisible();
	await signedExpect(feed.getByText("Pending")).toBeVisible();
	await signedExpect(feed.getByText("+$3,500.00").first()).toBeVisible();
	await signedExpect(page.getByRole("grid")).toHaveCount(0);

	await feed.getByRole("button", { name: /Joe Coffee/ }).click();
	const drawer = page.getByRole("dialog");
	await signedExpect(drawer.getByRole("heading", { name: "Joe Coffee" })).toBeVisible();
	await drawer.getByLabel("Category").selectOption({ label: "Entertainment" });
	await drawer.getByLabel("Notes").fill("Team coffee");
	await drawer.getByRole("button", { name: "Save" }).click();
	await signedExpect(drawer).toHaveCount(0);
	await signedExpect(
		feed.getByRole("button", { name: /Joe Coffee/ }).getByText("Entertainment"),
	).toBeVisible();

	await page.getByLabel("Search transactions").fill("whole");
	await signedExpect(page).toHaveURL(/search=whole/);
	await signedExpect(feed.getByRole("button")).toHaveCount(1);
	await page.getByLabel("Search transactions").fill("");
	await signedExpect(page).not.toHaveURL(/search=/);

	await page.getByRole("button", { name: "Edit multiple" }).click();
	await feed.getByRole("button", { name: /Uber/ }).click();
	await feed.getByRole("button", { name: /ACH DEBIT 0042/ }).click();
	await page.getByRole("button", { name: "Edit 2" }).click();
	await page.getByRole("dialog").getByLabel("Category").selectOption({ label: "Transport" });
	await page.getByRole("dialog").getByRole("button", { name: "Apply" }).click();
	await signedExpect(
		feed.getByRole("button", { name: /ACH DEBIT 0042/ }).getByText("Transport"),
	).toBeVisible();

	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("dialog", { name: "Filters" }).getByLabel("Transport").check();
	await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Done" }).click();
	await signedExpect(page).toHaveURL(/category=/);
	await signedExpect(feed.getByRole("button")).toHaveCount(2);
});

test("Transactions page: add a manual transaction and manage categories", async ({ page }) => {
	await page.goto("/transactions");
	await signedExpect(page.getByText("No transactions yet.")).toBeVisible();
	await page.getByRole("button", { name: "Add", exact: true }).click();
	const drawer = page.getByRole("dialog");
	await drawer.getByLabel("Name").fill("Cash tip");
	await drawer.getByLabel("Amount").fill("12.50");
	await drawer.getByRole("button", { name: "Add" }).click();
	const feed = page.getByRole("list", { name: "Transactions" });
	await signedExpect(feed.getByRole("button", { name: /Cash tip/ })).toBeVisible();
	await signedExpect(feed.getByText("-$12.50").first()).toBeVisible();

	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Manage categories" }).click();
	const manager = page.getByRole("dialog");
	await manager.getByRole("button", { name: "New category" }).click();
	await manager.getByLabel("Name").fill("Coffee shops");
	await manager.getByRole("button", { name: "Create category" }).click();
	await signedExpect(
		manager.getByRole("button", { name: "Coffee shops", exact: true }),
	).toBeVisible();
	await signedExpect(manager.getByText("Built in")).toBeVisible();
	await manager.getByRole("button", { name: "Delete Coffee shops" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
	await signedExpect(
		manager.getByRole("button", { name: "Coffee shops", exact: true }),
	).toHaveCount(0);
});
