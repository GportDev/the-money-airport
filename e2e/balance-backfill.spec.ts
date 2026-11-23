import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { daysAgo } from "./helpers/snapshots";

const API = "http://localhost:3000/api";
const HISTORY_TOKEN = "public-sandbox-fake-history";
const LATE_TOKEN = "public-sandbox-fake-late-history";

type Point = { date: string; accountId: string; balance: number };

async function link(page: Page, publicToken: string) {
	const res = await page.request.post(`${API}/plaid/exchange-token`, { data: { publicToken } });
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: { item: { id: string } } }).data.item.id;
}

async function sync(page: Page, itemId: string) {
	expect((await page.request.post(`${API}/plaid/sync/${itemId}`)).status()).toBe(200);
}

async function accountId(page: Page, name: string) {
	const res = await page.request.get(`${API}/accounts`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = rows.find((row) => row.name === name);
	if (!found) throw new Error(`No account ${name}`);
	return found.id;
}

async function history(page: Page, id: string, fromDaysAgo = 400) {
	const res = await page.request.get(
		`${API}/reports/balance-history?dateFrom=${daysAgo(fromDaysAgo)}&dateTo=${daysAgo(0)}&accountId=${id}`,
	);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: { points: Point[] } }).data.points;
}

function balanceOn(points: Point[], days: number) {
	return points.find((point) => point.date === daysAgo(days))?.balance;
}

test("linking fills checking balances back to the day before its first transaction", async ({
	page,
}) => {
	await link(page, HISTORY_TOKEN);
	const points = await history(page, await accountId(page, "History Checking"));

	expect(points[0]?.date).toBe(daysAgo(301));
	expect(points).toHaveLength(302);
	expect(balanceOn(points, 301)).toBe(70000);
	expect(balanceOn(points, 300)).toBe(60000);
	expect(balanceOn(points, 11)).toBe(60000);
	expect(balanceOn(points, 10)).toBe(110000);
	expect(balanceOn(points, 0)).toBe(110000);
});

test("pending transactions do not move estimated balances", async ({ page }) => {
	await link(page, HISTORY_TOKEN);
	const points = await history(page, await accountId(page, "History Checking"));

	expect(balanceOn(points, 3)).toBe(110000);
	expect(balanceOn(points, 1)).toBe(110000);
});

test("a card's amount owed is rebuilt from its purchases", async ({ page }) => {
	await link(page, HISTORY_TOKEN);
	const points = await history(page, await accountId(page, "History Card"));

	expect(points[0]?.date).toBe(daysAgo(6));
	expect(balanceOn(points, 6)).toBe(39000);
	expect(balanceOn(points, 5)).toBe(41000);
	expect(balanceOn(points, 0)).toBe(41000);
});

test("investment and loan accounts keep history from today only", async ({ page }) => {
	await link(page, HISTORY_TOKEN);
	for (const name of ["History Brokerage", "History Loan"]) {
		const points = await history(page, await accountId(page, name));
		expect(points.map((point) => point.date)).toEqual([daysAgo(0)]);
	}
});

test("history that arrives on a later sync extends the estimates", async ({ page }) => {
	const itemId = await link(page, LATE_TOKEN);
	const id = await accountId(page, "Late Checking");
	expect((await history(page, id)).map((point) => point.date)).toEqual([daysAgo(0)]);

	await sync(page, itemId);
	const points = await history(page, id);
	expect(points[0]?.date).toBe(daysAgo(61));
	expect(balanceOn(points, 61)).toBe(198000);
	expect(balanceOn(points, 60)).toBe(197000);
	expect(balanceOn(points, 21)).toBe(197000);
	expect(balanceOn(points, 20)).toBe(200000);
});

test("a removed transaction is dropped from the estimates on the next sync", async ({ page }) => {
	const itemId = await link(page, LATE_TOKEN);
	await sync(page, itemId);
	await sync(page, itemId);
	const points = await history(page, await accountId(page, "Late Checking"));

	expect(points[0]?.date).toBe(daysAgo(21));
	expect(balanceOn(points, 21)).toBe(197000);
	expect(balanceOn(points, 20)).toBe(200000);
});

test("net worth over a year starts from the estimated balances", async ({ page }) => {
	await link(page, HISTORY_TOKEN);
	const res = await page.request.get(`${API}/accounts/net-worth?range=1y`);
	expect(res.status()).toBe(200);
	const { series } = ((await res.json()) as { data: { series: { date: string; value: number }[] } })
		.data;

	expect(series[0]).toEqual({ date: daysAgo(301), value: 70000 });
	expect(series.find((point) => point.date === daysAgo(11))?.value).toBe(60000);
});

test("syncing Plaid leaves a manual account's history alone", async ({ page }) => {
	const created = await page.request.post(`${API}/accounts`, {
		data: { name: "Cash Jar", type: "checking", displayGroup: "cash", currentBalance: 12345 },
	});
	expect(created.status()).toBe(201);
	const manualId = ((await created.json()) as { data: { id: string } }).data.id;

	await link(page, HISTORY_TOKEN);
	const points = await history(page, manualId);
	expect(points).toEqual([{ date: daysAgo(0), accountId: manualId, balance: 12345 }]);
});

test("another User cannot read or change estimated history", async ({ page, browser }) => {
	await link(page, HISTORY_TOKEN);
	const checking = await accountId(page, "History Checking");
	const before = await history(page, checking);

	const context = await browser.newContext({ baseURL: "http://localhost:5173" });
	const other = await context.newPage();
	await signUp(other);
	const blocked = await other.request.get(
		`${API}/reports/balance-history?dateFrom=${daysAgo(30)}&dateTo=${daysAgo(0)}&accountId=${checking}`,
	);
	expect(blocked.status()).toBe(404);
	const otherItem = await link(other, HISTORY_TOKEN);
	await sync(other, otherItem);
	await context.close();

	expect(await history(page, checking)).toEqual(before);
});
