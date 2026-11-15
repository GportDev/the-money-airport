import { type Page, test as unsigned } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { daysAgo } from "./helpers/snapshots";

const API = "http://localhost:3000/api";

type Item = {
	id: string;
	merchantName: string;
	amount: number;
	isoCurrencyCode: string;
	cadence: "weekly" | "monthly" | "yearly";
	nextDate: string;
	daysUntil: number;
	lastPaidOn: string | null;
	isActive: boolean;
	isManual: boolean;
	account: { id: string; name: string } | null;
};
type Month = { remainingDue: number; paid: number; items: Item[] };
type Candidate = Omit<Item, "id" | "lastPaidOn" | "isActive" | "isManual">;

function inDays(days: number) {
	return daysAgo(-days);
}

/** Same calendar rule as the server: clamp to the last day of a shorter month. */
function addMonths(date: string, months: number) {
	const [year, month, day] = date.split("-").map(Number) as [number, number, number];
	const target = new Date(Date.UTC(year, month - 1 + months, 1));
	const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0));
	target.setUTCDate(Math.min(day, last.getUTCDate()));
	return target.toISOString().slice(0, 10);
}

async function createAccount(page: Page, name = "Checking") {
	const res = await page.request.post(`${API}/accounts`, {
		data: { name, type: "checking", displayGroup: "cash", currentBalance: 500_000 },
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function createItem(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/recurring`, { data });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Item }).data;
}

async function month(page: Page) {
	const res = await page.request.get(`${API}/recurring`);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: Month }).data;
}

async function detect(page: Page) {
	const res = await page.request.post(`${API}/recurring/detect`);
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Candidate[] }).data;
}

async function addCharge(
	page: Page,
	bankAccountId: string,
	name: string,
	amount: number,
	date: string,
) {
	const res = await page.request.post(`${API}/transactions`, {
		data: { name, amount, date, bankAccountId },
	});
	expect(res.status()).toBe(201);
}

async function transactionCount(page: Page) {
	const res = await page.request.get(`${API}/transactions?limit=100`);
	return ((await res.json()) as { data: unknown[] }).data.length;
}

/** Three monthly charges ending five days ago, plus irregular coffee that is not a pattern. */
async function seedHistory(page: Page) {
	const checking = await createAccount(page);
	for (const days of [65, 35, 5]) {
		await addCharge(page, checking, "Netflix", -1_549, daysAgo(days));
	}
	for (const days of [40, 38, 20, 3]) {
		await addCharge(page, checking, "Joe Coffee", -475, daysAgo(days));
	}
	return checking;
}

test("a new User has no recurring items and nothing due", async ({ page }) => {
	const data = await month(page);
	expect(data).toMatchObject({ remainingDue: 0, paid: 0, items: [] });
});

test("items list by next date and sum what is still due this month", async ({ page }) => {
	await createItem(page, {
		merchantName: "Gym",
		amount: 4_000,
		cadence: "monthly",
		nextDate: inDays(40),
	});
	await createItem(page, {
		merchantName: "Rent",
		amount: 150_000,
		cadence: "monthly",
		nextDate: daysAgo(2),
	});
	await createItem(page, {
		merchantName: "Old plan",
		amount: 999,
		cadence: "monthly",
		nextDate: inDays(1),
		isActive: false,
	});
	const data = await month(page);
	expect(data.items.map((item) => item.merchantName)).toEqual(["Rent", "Gym", "Old plan"]);
	const rent = data.items[0];
	expect(rent).toMatchObject({ daysUntil: -2, isActive: true, isManual: true, account: null });
	// Rent is overdue, so it is due; Gym falls after this month; inactive items never count.
	expect(data.remainingDue).toBe(150_000);
});

test("Mark paid advances the schedule and records the payment without adding a Transaction", async ({
	page,
}) => {
	const checking = await createAccount(page);
	const nextDate = daysAgo(1);
	const item = await createItem(page, {
		merchantName: "Verizon",
		amount: 8_000,
		cadence: "monthly",
		nextDate,
		bankAccountId: checking,
	});
	expect(item.account).toEqual({ id: checking, name: "Checking" });
	const before = await transactionCount(page);

	const paid = await page.request.post(`${API}/recurring/${item.id}/mark-paid`, { data: {} });
	expect(paid.status()).toBe(201);
	const body = ((await paid.json()) as { data: Item }).data;
	expect(body.nextDate).toBe(addMonths(nextDate, 1));
	expect(body.lastPaidOn).toBe(inDays(0));
	expect(await transactionCount(page)).toBe(before);
	expect((await month(page)).paid).toBe(8_000);
});

test("Skip advances the schedule by one period and leaves Last paid alone", async ({ page }) => {
	const nextDate = inDays(3);
	const item = await createItem(page, {
		merchantName: "Spotify",
		amount: 1_199,
		cadence: "weekly",
		nextDate,
	});
	const res = await page.request.post(`${API}/recurring/${item.id}/skip`);
	expect(res.status()).toBe(201);
	const body = ((await res.json()) as { data: Item }).data;
	expect(body.nextDate).toBe(inDays(10));
	expect(body.lastPaidOn).toBeNull();
});

test("PATCH edits amount, cadence, next date, and active; DELETE removes the item", async ({
	page,
}) => {
	const item = await createItem(page, {
		merchantName: "iCloud",
		amount: 299,
		cadence: "monthly",
		nextDate: inDays(5),
	});
	const res = await page.request.patch(`${API}/recurring/${item.id}`, {
		data: { amount: 999, cadence: "yearly", nextDate: inDays(9), isActive: false },
	});
	expect(res.status()).toBe(200);
	expect(((await res.json()) as { data: Item }).data).toMatchObject({
		amount: 999,
		cadence: "yearly",
		nextDate: inDays(9),
		isActive: false,
	});
	const removed = await page.request.delete(`${API}/recurring/${item.id}`);
	expect(removed.status()).toBe(200);
	expect((await month(page)).items).toEqual([]);
});

test("bad input is rejected", async ({ page }) => {
	const base = { merchantName: "Gym", amount: 4_000, cadence: "monthly", nextDate: inDays(2) };
	for (const data of [
		{ ...base, amount: 0 },
		{ ...base, cadence: "daily" },
		{ ...base, nextDate: "soon" },
		{ ...base, merchantName: " " },
	]) {
		const res = await page.request.post(`${API}/recurring`, { data });
		expect(res.status(), JSON.stringify(data)).toBe(400);
	}
	const month = await page.request.get(`${API}/recurring?month=2026-13`);
	expect(month.status()).toBe(400);
});

test("detect finds a steady monthly charge, skips irregular ones, and stops once it is tracked", async ({
	page,
}) => {
	const checking = await seedHistory(page);
	const candidates = await detect(page);
	expect(candidates).toHaveLength(1);
	const netflix = candidates[0];
	expect(netflix).toMatchObject({
		merchantName: "Netflix",
		amount: 1_549,
		cadence: "monthly",
		nextDate: addMonths(daysAgo(5), 1),
		account: { id: checking, name: "Checking" },
	});

	await createItem(page, {
		merchantName: "Netflix",
		amount: 1_549,
		cadence: "monthly",
		nextDate: netflix?.nextDate,
		bankAccountId: checking,
		isManual: false,
	});
	expect(await detect(page)).toEqual([]);
});

unsigned("Users never see or change each other's recurring items", async ({ browser }) => {
	const owner = await browser.newPage();
	await signUp(owner);
	const checking = await createAccount(owner);
	const item = await createItem(owner, {
		merchantName: "Rent",
		amount: 150_000,
		cadence: "monthly",
		nextDate: inDays(4),
		bankAccountId: checking,
	});
	for (const days of [65, 35, 5]) {
		await addCharge(owner, checking, "Netflix", -1_549, daysAgo(days));
	}

	const other = await browser.newPage();
	await signUp(other);
	expect((await month(other)).items).toEqual([]);
	expect(await detect(other)).toEqual([]);
	const attempts = [
		other.request.patch(`${API}/recurring/${item.id}`, { data: { amount: 1 } }),
		other.request.post(`${API}/recurring/${item.id}/mark-paid`, { data: {} }),
		other.request.post(`${API}/recurring/${item.id}/skip`),
		other.request.delete(`${API}/recurring/${item.id}`),
		other.request.post(`${API}/recurring`, {
			data: {
				merchantName: "X",
				amount: 1,
				cadence: "monthly",
				nextDate: inDays(1),
				bankAccountId: checking,
			},
		}),
	];
	for (const res of await Promise.all(attempts)) {
		expect(res.status()).toBe(404);
	}
	expect((await month(owner)).items[0]).toMatchObject({ amount: 150_000, nextDate: inDays(4) });
	await owner.close();
	await other.close();
});

test("the Recurring page offers Add when empty and lists what was added", async ({ page }) => {
	await page.goto("/recurring");
	const main = page.getByRole("main");
	await expect(main.getByText("No recurring bills yet")).toBeVisible();
	await main.getByRole("button", { name: "Add recurring" }).click();

	const drawer = page.getByRole("dialog", { name: "Add recurring" });
	await drawer.getByRole("button", { name: "Add" }).click();
	await expect(drawer.getByRole("alert")).toHaveText("Enter a name.");
	await drawer.getByLabel("Name").fill("Gym");
	await drawer.getByLabel("Amount").fill("40");
	await drawer.getByLabel("Next date").fill(inDays(15));
	await drawer.getByRole("button", { name: "Add" }).click();

	await expect(page.getByText("Gym added")).toBeVisible();
	const upcoming = main.getByRole("region", { name: "Upcoming" });
	await expect(upcoming.getByRole("button", { name: /Gym/ })).toContainText("in 15 days");
	await expect(upcoming.getByRole("button", { name: /Gym/ })).toContainText("$40.00");
});

test("the drawer marks paid, skips, and deactivates", async ({ page }) => {
	await createItem(page, {
		merchantName: "Verizon",
		amount: 8_000,
		cadence: "weekly",
		nextDate: inDays(2),
	});
	await page.goto("/recurring");
	const main = page.getByRole("main");
	const summary = main.getByText(/remaining due this month/);
	await expect(summary).toContainText("$0.00 paid");

	await main.getByRole("button", { name: /Verizon/ }).click();
	let drawer = page.getByRole("dialog", { name: "Verizon" });
	await drawer.getByRole("button", { name: "Mark paid" }).click();
	await expect(page.getByText(/Verizon paid · next/)).toBeVisible();
	await expect(drawer).toBeHidden();
	await expect(main.getByRole("button", { name: /Verizon/ })).toContainText("in 9 days");
	await expect(summary).toContainText("$80.00 paid");

	await main.getByRole("button", { name: /Verizon/ }).click();
	drawer = page.getByRole("dialog", { name: "Verizon" });
	await drawer.getByRole("button", { name: "Skip" }).click();
	await expect(page.getByText(/Skipped · next/)).toBeVisible();
	await expect(drawer).toBeHidden();
	await expect(main.getByRole("button", { name: /Verizon/ })).toContainText("in 16 days");

	await main.getByRole("button", { name: /Verizon/ }).click();
	drawer = page.getByRole("dialog", { name: "Verizon" });
	await drawer.getByLabel("Active").click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Verizon saved")).toBeVisible();
	await expect(main.getByRole("region", { name: "Inactive" })).toContainText("Verizon");
	await expect(main.getByRole("region", { name: "Upcoming" })).toHaveCount(0);
});

test("the drawer deletes after confirming", async ({ page }) => {
	await createItem(page, {
		merchantName: "iCloud",
		amount: 299,
		cadence: "monthly",
		nextDate: inDays(5),
	});
	await page.goto("/recurring");
	await page
		.getByRole("main")
		.getByRole("button", { name: /iCloud/ })
		.click();
	await page
		.getByRole("dialog", { name: "iCloud" })
		.getByRole("button", { name: "Delete" })
		.click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
	await expect(page.getByText("iCloud deleted")).toBeVisible();
	await expect(page.getByRole("main").getByText("No recurring bills yet")).toBeVisible();
});

test("the detection banner adds or dismisses what it found", async ({ page }) => {
	const checking = await seedHistory(page);
	await addCharge(page, checking, "Hulu", -799, daysAgo(62));
	await addCharge(page, checking, "Hulu", -799, daysAgo(32));
	await addCharge(page, checking, "Hulu", -799, daysAgo(2));
	await page.goto("/recurring");
	const banner = page.getByRole("region", { name: "Found 2 recurring charges" });
	await expect(banner).toBeVisible();

	await banner.getByRole("button", { name: "Add Netflix" }).click();
	await expect(page.getByText("Netflix added")).toBeVisible();
	await expect(page.getByRole("region", { name: "Upcoming" })).toContainText("Netflix");

	await page.getByRole("button", { name: "Dismiss Hulu" }).click();
	await expect(page.getByText("Hulu dismissed")).toBeVisible();
	await expect(page.getByRole("region", { name: "Inactive" })).toContainText("Hulu");
	await expect(page.getByRole("region", { name: /recurring charge/ })).toHaveCount(0);
});

test("the Dashboard Recurring widget lists upcoming bills and what is due", async ({ page }) => {
	await createAccount(page);
	await createItem(page, {
		merchantName: "Rent",
		amount: 150_000,
		cadence: "monthly",
		nextDate: daysAgo(1),
	});
	await createItem(page, {
		merchantName: "Gym",
		amount: 4_000,
		cadence: "monthly",
		nextDate: inDays(3),
	});
	const res = await page.request.get(`${API}/dashboard`);
	const dashboard = ((await res.json()) as { data: { recurring: { upcoming: Item[] } } }).data;
	expect(dashboard.recurring.upcoming.map((item) => item.merchantName)).toEqual(["Rent", "Gym"]);

	await page.goto("/");
	const widget = page.getByRole("main").getByRole("region", { name: "Recurring" });
	await expect(widget).toContainText("Every month · 1 day overdue");
	await expect(widget).toContainText("Gym");
	await expect(widget).toContainText("in 3 days");
});
