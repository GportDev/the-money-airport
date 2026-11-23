import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type Detail = {
	id: string;
	amount: number;
	isSplit: boolean;
	split: { parentId: string; total: number; parts: { id: string; amount: number }[] } | null;
};

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = rows.find((row) => row.name === name);
	if (!found) throw new Error(`No category ${name}`);
	return found.id;
}

async function createTransaction(page: Page, name: string, amount: number) {
	const res = await page.request.post(`${API}/transactions`, {
		data: {
			name,
			amount,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});
	return ((await res.json()) as { data: Detail }).data.id;
}

async function getDetail(page: Page, id: string) {
	const res = await page.request.get(`${API}/transactions/${id}`);
	return ((await res.json()) as { data: Detail }).data;
}

async function pickCategory(page: Page, label: string, name: string) {
	await page.getByRole("combobox", { name: label }).click();
	await page.getByRole("combobox", { name: "Search categories" }).fill(name);
	await page.getByRole("option", { name }).click();
}

test("splits a Transaction into parts that add up to its amount", async ({ page }) => {
	const id = await createTransaction(page, "Corner Market", -10000);
	await page.goto("/transactions");
	const feed = page.getByRole("list", { name: "Transactions" });
	await feed.getByRole("button", { name: /Corner Market/ }).click({ position: { x: 60, y: 12 } });
	const drawer = page.getByRole("dialog");
	await drawer.getByRole("button", { name: "Split transaction" }).click();

	const editor = drawer.getByRole("form", { name: "Split transaction" });
	const save = editor.getByRole("button", { name: "Save split" });
	await expect(editor.getByLabel("Part 1 amount")).toHaveValue("100.00");
	await expect(save).toBeDisabled();

	await editor.getByLabel("Part 1 amount").fill("60");
	await pickCategory(page, "Part 2 category", "Dining");
	await editor.getByLabel("Part 2 amount").fill("25");
	await expect(editor.getByRole("status")).toContainText("Left $15.00");
	await expect(save).toBeDisabled();

	await editor.getByLabel("Part 2 amount").fill("50");
	await expect(editor.getByRole("status")).toContainText("Over by $10.00");
	await editor.getByLabel("Part 2 amount").fill("25");

	await editor.getByRole("button", { name: "Add part" }).click();
	await expect(editor.getByLabel("Part 3 amount")).toHaveValue("15.00");
	await pickCategory(page, "Part 3 category", "Shopping");
	await expect(editor.getByRole("status")).toContainText("Adds up");
	await save.click();
	await expect(page.getByText("Split into 3 parts").first()).toBeVisible();

	const detail = await getDetail(page, id);
	expect(detail.split?.total).toBe(-10000);
	expect(detail.split?.parts.map((part) => part.amount)).toEqual([-6000, -2500, -1500]);
	expect(detail.amount).toBe(-6000);

	await page.keyboard.press("Escape");
	await expect(feed.getByRole("button", { name: /Corner Market, Split/ })).toHaveCount(3);
	const list = await page.request.get(`${API}/transactions?limit=200`);
	const rows = ((await list.json()) as { data: Detail[] }).data;
	expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(-10000);
});

test("Unsplit folds the parts back into one Transaction", async ({ page }) => {
	const id = await createTransaction(page, "Hardware Store", -4000);
	const split = await page.request.put(`${API}/transactions/${id}/split`, {
		data: {
			parts: [
				{ categoryId: await categoryId(page, "Groceries"), amount: -1000 },
				{ categoryId: await categoryId(page, "Shopping"), amount: -3000 },
			],
		},
	});
	expect(split.status()).toBe(200);

	await page.goto("/transactions");
	const feed = page.getByRole("list", { name: "Transactions" });
	await expect(feed.getByRole("button", { name: /Hardware Store, Split/ })).toHaveCount(2);
	await feed
		.getByRole("button", { name: /Hardware Store, Split/ })
		.first()
		.click({ position: { x: 60, y: 12 } });
	const drawer = page.getByRole("dialog");
	await expect(drawer.getByRole("heading", { name: "Split into 2 parts" })).toBeVisible();
	await drawer.getByRole("button", { name: "Edit split" }).click();
	await drawer.getByRole("button", { name: "Unsplit" }).click();
	await expect(page.getByText("Split removed").first()).toBeVisible();

	const detail = await getDetail(page, id);
	expect(detail.split).toBeNull();
	expect(detail.amount).toBe(-4000);
	await page.keyboard.press("Escape");
	await expect(feed.getByRole("button", { name: /Hardware Store/ })).toHaveCount(1);
});

test("the split API rejects parts that do not add up and hides other Users' Transactions", async ({
	page,
	browser,
}) => {
	const id = await createTransaction(page, "Book Shop", -2000);
	const groceries = await categoryId(page, "Groceries");
	const put = (parts: { categoryId: string; amount: number }[]) =>
		page.request.put(`${API}/transactions/${id}/split`, { data: { parts } });

	expect((await put([{ categoryId: groceries, amount: -2000 }])).status()).toBe(400);
	expect(
		(
			await put([
				{ categoryId: groceries, amount: -1500 },
				{ categoryId: groceries, amount: -1000 },
			])
		).status(),
	).toBe(400);
	expect(
		(
			await put([
				{ categoryId: groceries, amount: -2500 },
				{ categoryId: groceries, amount: 500 },
			])
		).status(),
	).toBe(400);
	expect((await page.request.delete(`${API}/transactions/${id}/split`)).status()).toBe(400);

	const otherContext = await browser.newContext({ baseURL: "http://localhost:5173" });
	const other = await otherContext.newPage();
	await signUp(other);
	const otherGroceries = await categoryId(other, "Groceries");
	const stolen = await other.request.put(`${API}/transactions/${id}/split`, {
		data: {
			parts: [
				{ categoryId: otherGroceries, amount: -1000 },
				{ categoryId: otherGroceries, amount: -1000 },
			],
		},
	});
	expect(stolen.status()).toBe(404);
	expect((await other.request.delete(`${API}/transactions/${id}/split`)).status()).toBe(404);
	await otherContext.close();

	expect((await getDetail(page, id)).split).toBeNull();
});

test("a split part cannot change its amount until unsplit", async ({ page }) => {
	const id = await createTransaction(page, "Gas Station", -3000);
	const groceries = await categoryId(page, "Groceries");
	await page.request.put(`${API}/transactions/${id}/split`, {
		data: {
			parts: [
				{ categoryId: groceries, amount: -1000 },
				{ categoryId: groceries, amount: -2000 },
			],
		},
	});
	const edit = await page.request.patch(`${API}/transactions/${id}`, { data: { amount: -500 } });
	expect(edit.status()).toBe(400);
});

test("a split Plaid Transaction keeps its parts through a sync", async ({ page }) => {
	await page.request.post(`${API}/plaid/create-link-token`);
	const exchanged = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	const itemId = ((await exchanged.json()) as { data: { item: { id: string } } }).data.item.id;
	const list = await page.request.get(`${API}/transactions?limit=200&search=Amazon`);
	const amazon = ((await list.json()) as { data: Detail[] }).data[0];
	if (!amazon) throw new Error("No Amazon transaction");
	const total = amazon.amount;
	const dining = await categoryId(page, "Dining");
	const split = await page.request.put(`${API}/transactions/${amazon.id}/split`, {
		data: {
			parts: [
				{ categoryId: dining, amount: total + 1000 },
				{ categoryId: dining, amount: -1000 },
			],
		},
	});
	expect(split.status()).toBe(200);

	expect((await page.request.post(`${API}/plaid/sync/${itemId}`)).status()).toBe(200);

	const after = await page.request.get(`${API}/transactions?limit=200&search=Amazon`);
	const rows = ((await after.json()) as { data: Detail[] }).data;
	expect(rows).toHaveLength(2);
	expect(rows.every((row) => row.isSplit)).toBe(true);
	expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(total);
});
