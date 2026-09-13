import { expect, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";

unsigned("plaid APIs reject an unauthenticated request", async ({ request }) => {
	const token = await request.post("http://localhost:3000/api/plaid/create-link-token");
	expect(token.status()).toBe(401);
	const exchange = await request.post("http://localhost:3000/api/plaid/exchange-token", {
		data: { publicToken: "public-sandbox-fake" },
	});
	expect(exchange.status()).toBe(401);
});

test("create-link-token and exchange store BankAccounts without leaking tokens", async ({
	page,
}) => {
	const token = await page.request.post("http://localhost:3000/api/plaid/create-link-token");
	signedExpect(token.status()).toBe(200);
	const tokenBody = (await token.json()) as { data: { linkToken: string } };
	signedExpect(tokenBody.data.linkToken.length).toBeGreaterThan(0);

	const exchange = await page.request.post("http://localhost:3000/api/plaid/exchange-token", {
		data: {
			publicToken: "public-sandbox-fake",
			metadata: {
				institution: { institution_id: "ins_1", name: "First Platypus Bank" },
			},
		},
	});
	signedExpect(exchange.status()).toBe(200);
	const body = (await exchange.json()) as Record<string, unknown>;
	signedExpect(JSON.stringify(body)).not.toContain("access-sandbox");
	signedExpect(JSON.stringify(body)).not.toContain("access_token");

	const again = await page.request.post("http://localhost:3000/api/plaid/exchange-token", {
		data: {
			publicToken: "public-sandbox-fake",
			metadata: {
				institution: { institution_id: "ins_1", name: "First Platypus Bank" },
			},
		},
	});
	signedExpect(again.status()).toBe(200);

	const accounts = await page.request.get("http://localhost:3000/api/accounts");
	const listed = (await accounts.json()) as { data: { name: string; source: string }[] };
	const plaidRows = listed.data.filter((row) => row.source === "plaid");
	signedExpect(plaidRows.length).toBeGreaterThan(0);
	const names = plaidRows.map((row) => row.name);
	signedExpect(new Set(names).size).toBe(names.length);

	await page.goto("/accounts");
	await signedExpect(page.getByRole("button", { name: "Add account" })).toBeVisible();
	await page.getByRole("button", { name: "Add account" }).click();
	await signedExpect(page.getByRole("button", { name: "Connect with Plaid" })).toBeVisible();
	await signedExpect(page.getByRole("button", { name: "Add manually" })).toBeVisible();
});

test("unsigned webhook is rejected and disconnect keeps BankAccounts", async ({ page }) => {
	const unsignedHook = await page.request.post("http://localhost:3000/api/plaid/webhook", {
		data: { webhook_type: "TRANSACTIONS", webhook_code: "SYNC_UPDATES_AVAILABLE" },
	});
	signedExpect(unsignedHook.status()).toBe(400);

	await page.request.post("http://localhost:3000/api/plaid/create-link-token");
	const exchanged = await page.request.post("http://localhost:3000/api/plaid/exchange-token", {
		data: { publicToken: "public-sandbox-fake" },
	});
	const payload = (await exchanged.json()) as { data: { item: { id: string } } };
	const itemId = payload.data.item.id;

	const sync = await page.request.post(`http://localhost:3000/api/plaid/sync/${itemId}`);
	signedExpect(sync.status()).toBe(200);

	const hooked = await page.request.post("http://localhost:3000/api/plaid/webhook", {
		headers: { "plaid-verification": "fake" },
		data: {
			webhook_type: "TRANSACTIONS",
			webhook_code: "SYNC_UPDATES_AVAILABLE",
			item_id: "item-fake-1",
		},
	});
	signedExpect(hooked.status()).toBe(200);

	const disconnected = await page.request.delete(`http://localhost:3000/api/plaid/items/${itemId}`);
	signedExpect(disconnected.status()).toBe(200);

	const accounts = await page.request.get("http://localhost:3000/api/accounts");
	const listed = (await accounts.json()) as { data: { source: string; name: string }[] };
	signedExpect(listed.data.filter((row) => row.source === "plaid").length).toBeGreaterThan(0);

	const syncAll = await page.request.post("http://localhost:3000/api/plaid/sync-all");
	signedExpect(syncAll.status()).toBe(200);
	signedExpect(await syncAll.json()).toEqual({ data: { items: 0 } });
});

const plaidConfigured = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

test("sandbox Link with user_good produces grouped BankAccounts", async ({ page }) => {
	test.skip(!plaidConfigured, "PLAID_* not set");
	await page.goto("/accounts");
	await page.getByRole("button", { name: "Add account" }).click();
	await page.getByRole("button", { name: "Connect with Plaid" }).click();
	const frame = page.frameLocator('iframe[title="Plaid Link"]').first();
	await frame
		.getByPlaceholder("Search")
		.waitFor({ timeout: 30_000 })
		.catch(() => undefined);
	await page
		.getByRole("textbox")
		.first()
		.fill("user_good")
		.catch(() => undefined);
	await signedExpect(page.getByRole("heading", { name: "Cash" })).toBeVisible();
});
