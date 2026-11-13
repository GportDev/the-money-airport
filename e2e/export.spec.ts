import { readFile } from "node:fs/promises";
import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";
const TRANSACTIONS_HEADER = "Date,Name,Merchant,Amount,Currency,Category,Account,Pending,Notes";
const ACCOUNTS_HEADER = "Name,Institution,Type,Group,Balance,Currency,Hidden";

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data;
}

async function createTransaction(
	page: Page,
	input: { name: string; amount: number; date: string; notes?: string; bankAccountId?: string },
) {
	const res = await page.request.post(`${API}/transactions`, { data: input });
	signedExpect(res.status()).toBe(201);
}

async function csvLines(page: Page, path: string) {
	const res = await page.request.get(`${API}${path}`);
	signedExpect(res.status()).toBe(200);
	signedExpect(res.headers()["content-type"]).toContain("text/csv");
	return (await res.text()).trimEnd().split(/\r?\n/);
}

unsigned("export APIs reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/export/transactions`)).status()).toBe(401);
	expect((await request.get(`${API}/export/accounts`)).status()).toBe(401);
});

test("export rejects an unknown format and a bad date", async ({ page }) => {
	signedExpect((await page.request.get(`${API}/export/transactions?format=xlsx`)).status()).toBe(
		400,
	);
	signedExpect(
		(await page.request.get(`${API}/export/transactions?dateFrom=yesterday`)).status(),
	).toBe(400);
	signedExpect((await page.request.get(`${API}/export/accounts?format=pdf`)).status()).toBe(400);
});

test("transactions CSV lists rows newest first with signed amounts", async ({ page }) => {
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	await createTransaction(page, {
		name: "Coffee, large",
		amount: -1250,
		date: "2026-03-02",
		bankAccountId: checking.id,
	});
	await createTransaction(page, {
		name: "Paycheck",
		amount: 300_000,
		date: "2026-03-05",
		notes: 'said "thanks"',
		bankAccountId: checking.id,
	});

	const res = await page.request.get(`${API}/export/transactions?format=csv`);
	signedExpect(res.headers()["content-disposition"]).toMatch(
		/attachment; filename="transactions-\d{4}-\d{2}-\d{2}\.csv"/,
	);
	const lines = await csvLines(page, "/export/transactions");
	signedExpect(lines).toEqual([
		TRANSACTIONS_HEADER,
		'2026-03-05,Paycheck,,3000.00,USD,Uncategorized,Checking,false,"said ""thanks"""',
		'2026-03-02,"Coffee, large",,-12.50,USD,Uncategorized,Checking,false,',
	]);
});

test("transactions CSV honours dateFrom and dateTo", async ({ page }) => {
	await createTransaction(page, { name: "February", amount: -100, date: "2026-02-10" });
	await createTransaction(page, { name: "March", amount: -200, date: "2026-03-10" });
	await createTransaction(page, { name: "April", amount: -300, date: "2026-04-10" });
	const lines = await csvLines(page, "/export/transactions?dateFrom=2026-03-01&dateTo=2026-03-31");
	signedExpect(lines).toHaveLength(2);
	signedExpect(lines[1]).toContain("March");
});

test("transactions CSV defuses spreadsheet formulas in text cells", async ({ page }) => {
	await createTransaction(page, {
		name: "=HYPERLINK(1)",
		amount: -100,
		date: "2026-03-10",
		notes: "@risk",
	});
	const lines = await csvLines(page, "/export/transactions");
	signedExpect(lines[1]).toBe("2026-03-10,'=HYPERLINK(1),,-1.00,USD,Uncategorized,,false,'@risk");
});

test("exports only include the signed-in user's rows", async ({ page, browser }) => {
	await createAccount(page, {
		name: "Owner savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 5000,
	});
	await createTransaction(page, { name: "Owner only", amount: -500, date: "2026-03-10" });

	const other = await browser.newPage();
	await signUp(other);
	signedExpect(await csvLines(other, "/export/transactions")).toEqual([TRANSACTIONS_HEADER]);
	const accounts = await csvLines(other, "/export/accounts");
	signedExpect(accounts.join("\n")).not.toContain("Owner savings");
	signedExpect(accounts[0]).toBe(ACCOUNTS_HEADER);
	await other.close();
});

test("accounts CSV lists accounts and server-side totals", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 250_000,
	});
	await createAccount(page, {
		name: "Visa",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 40_000,
	});
	const lines = await csvLines(page, "/export/accounts?format=csv");
	signedExpect(lines).toEqual([
		ACCOUNTS_HEADER,
		"Checking,,checking,Cash,2500.00,USD,false",
		"Visa,,credit,Credit Cards,400.00,USD,false",
		"",
		"Total assets,,,,2500.00,USD,",
		"Total liabilities,,,,400.00,USD,",
		"Net worth,,,,2100.00,USD,",
	]);
});

test("Accounts panel downloads the accounts CSV", async ({ page }) => {
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 1000,
	});
	await page.goto("/accounts");
	const panel = page.getByRole("complementary", { name: "Summary" });
	const download = page.waitForEvent("download");
	await panel.getByRole("button", { name: "Download CSV" }).click();
	const file = await download;
	signedExpect(file.suggestedFilename()).toMatch(/^accounts-\d{4}-\d{2}-\d{2}\.csv$/);
	const content = await readFile(await file.path(), "utf8");
	signedExpect(content).toContain("Checking,,checking,Cash,10.00,USD,false");
	await signedExpect(page.getByText("CSV downloaded")).toBeVisible();
});

test("Settings exports the transactions CSV", async ({ page }) => {
	await createTransaction(page, { name: "Lunch", amount: -1500, date: "2026-03-10" });
	await page.goto("/settings");
	const data = page.getByRole("region", { name: "Data" });
	const download = page.waitForEvent("download");
	await data.getByRole("button", { name: "Export transactions CSV" }).click();
	const file = await download;
	signedExpect(file.suggestedFilename()).toMatch(/^transactions-\d{4}-\d{2}-\d{2}\.csv$/);
	const content = await readFile(await file.path(), "utf8");
	signedExpect(content).toContain("2026-03-10,Lunch,,-15.00,USD");
	await signedExpect(page.getByText("CSV downloaded")).toBeVisible();
});
