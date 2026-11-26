import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { chooseOption } from "./helpers/select";

const API = "http://localhost:3000/api";

type Account = {
	id: string;
	name: string;
	displayGroup: string;
	source: string;
	creditLimit: number | null;
};

async function connectFakeBank(page: Page) {
	await page.request.post(`${API}/plaid/create-link-token`);
	const exchanged = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	expect(exchanged.status()).toBe(200);
	return ((await exchanged.json()) as { data: { item: { id: string } } }).data.item.id;
}

async function accounts(page: Page) {
	const res = await page.request.get(`${API}/accounts`);
	return ((await res.json()) as { data: Account[] }).data;
}

async function createAccount(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/accounts`, { data });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Account }).data;
}

test("a renamed Plaid account keeps the User's name after a sync", async ({ page }) => {
	const itemId = await connectFakeBank(page);
	const checking = (await accounts(page)).find((row) => row.name === "Plaid Checking");
	if (!checking) throw new Error("Plaid Checking missing");

	await page.goto("/accounts");
	await page.getByRole("button", { name: /Plaid Checking/ }).click();
	await page.getByRole("dialog").getByLabel("Name").fill("Everyday checking");
	await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);

	expect((await page.request.post(`${API}/plaid/sync/${itemId}`)).status()).toBe(200);
	const after = (await accounts(page)).find((row) => row.id === checking.id);
	expect(after?.name).toBe("Everyday checking");
	await page.reload();
	await expect(page.getByRole("button", { name: /Everyday checking/ })).toBeVisible();
});

test("only credit cards carry a credit limit", async ({ page }) => {
	const cash = await createAccount(page, {
		name: "Wallet",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 10_000,
		creditLimit: 50_000,
	});
	expect(cash.creditLimit).toBeNull();
	const patched = await page.request.patch(`${API}/accounts/${cash.id}`, {
		data: { creditLimit: 50_000 },
	});
	expect(patched.status()).toBe(400);
	const card = await createAccount(page, {
		name: "Travel card",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 10_000,
		creditLimit: 50_000,
	});
	expect(card.creditLimit).toBe(50_000);

	await page.goto("/accounts");
	await page.getByRole("button", { name: /Wallet/ }).click();
	await expect(page.getByRole("dialog").getByLabel("Name")).toHaveValue("Wallet");
	await expect(page.getByRole("dialog").getByLabel("Credit limit")).toHaveCount(0);
	await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await page.getByRole("button", { name: /Travel card/ }).click();
	await expect(page.getByRole("dialog").getByLabel("Credit limit")).toHaveValue("500.00");

	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Add account" }).click();
	await page.getByRole("button", { name: "Add manually" }).click();
	await expect(page.getByRole("dialog").getByLabel("Credit limit")).toHaveCount(0);
	await chooseOption(page, page.getByRole("dialog").getByLabel("Display group"), "Credit Cards");
	await expect(page.getByRole("dialog").getByLabel("Credit limit")).toBeVisible();
});

test("an account lists its transactions in the timeframe and opens them in Transactions", async ({
	page,
}) => {
	const account = await createAccount(page, {
		name: "Side checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 10_000,
	});
	const today = new Date().toISOString().slice(0, 10);
	for (const [name, date] of [
		["Recent lunch", today],
		["Old lunch", "2020-01-15"],
	] as const) {
		await page.request.post(`${API}/transactions`, {
			data: { name, amount: -1500, date, bankAccountId: account.id },
		});
	}
	await page.request.post(`${API}/transactions`, {
		data: { name: "Elsewhere", amount: -900, date: today },
	});

	await page.goto("/accounts?range=1m");
	await page.getByRole("button", { name: /Side checking/ }).click();
	const list = page.getByRole("list", { name: "Side checking transactions" });
	await expect(list.getByRole("button", { name: /Recent lunch/ })).toBeVisible();
	await expect(list.getByRole("button", { name: /Old lunch/ })).toHaveCount(0);
	await expect(list.getByRole("button", { name: /Elsewhere/ })).toHaveCount(0);

	await page.getByRole("link", { name: "Open in Transactions" }).click();
	await expect(page).toHaveURL(new RegExp(`/transactions\\?account=${account.id}&from=`));
	const feed = page.getByRole("list", { name: "Transactions" });
	await expect(feed.getByRole("button", { name: /Recent lunch/ })).toBeVisible();
	await expect(feed.getByRole("button", { name: /Elsewhere/ })).toHaveCount(0);
});

test("Filters and Add account open next to their buttons without blocking the page", async ({
	page,
}) => {
	await page.goto("/accounts");
	const filtersButton = page.getByRole("button", { name: "Filters" });
	await filtersButton.click();
	const filters = page.getByRole("dialog", { name: "Filters" });
	await expect(filters).toBeVisible();
	const trigger = await filtersButton.boundingBox();
	const panel = await filters.boundingBox();
	if (!trigger || !panel) throw new Error("Missing boxes");
	expect(panel.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
	expect(panel.y - (trigger.y + trigger.height)).toBeLessThan(24);

	await page.getByRole("heading", { name: "Accounts", level: 1 }).click();
	await expect(filters).toHaveCount(0);

	const addButton = page.getByRole("button", { name: "Add account" });
	await addButton.click();
	const chooser = page.getByRole("dialog", { name: "Add account" });
	await expect(chooser).toBeVisible();
	const addBox = await addButton.boundingBox();
	const chooserBox = await chooser.boundingBox();
	if (!addBox || !chooserBox) throw new Error("Missing boxes");
	expect(chooserBox.y - (addBox.y + addBox.height)).toBeLessThan(24);
	expect(Math.abs(chooserBox.x + chooserBox.width - (addBox.x + addBox.width))).toBeLessThan(4);
	await page.getByRole("button", { name: "Refresh all" }).click();
	await expect(page.getByText(/Refreshing accounts|Accounts refreshed/)).toBeVisible();
});

test("account details stay with their own User", async ({ page, browser }) => {
	const account = await createAccount(page, {
		name: "Private checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 10_000,
	});
	const other = await browser.newPage();
	await signUp(other);
	const renamed = await other.request.patch(`${API}/accounts/${account.id}`, {
		data: { name: "Taken" },
	});
	expect(renamed.status()).toBe(404);
	const feed = await other.request.get(`${API}/transactions?accountId=${account.id}`);
	expect(((await feed.json()) as { data: unknown[] }).data).toEqual([]);
	await other.close();
	expect((await accounts(page)).find((row) => row.id === account.id)?.name).toBe(
		"Private checking",
	);
});
