import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { seedFxRate } from "./helpers/fx";

const groups = ["Cash", "Credit Cards", "Investments", "Loans", "Vehicles", "Other"] as const;

unsigned("accounts APIs reject an unauthenticated request", async ({ request }) => {
	const accounts = await request.get("http://localhost:3000/api/accounts");
	expect(accounts.status()).toBe(401);
	const netWorth = await request.get("http://localhost:3000/api/accounts/net-worth");
	expect(netWorth.status()).toBe(401);
});

test("empty Accounts shows net worth 0, groups, and actions", async ({ page }) => {
	await page.goto("/accounts");
	await signedExpect(page.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
	await signedExpect(page.getByRole("heading", { name: "Net worth" })).toBeVisible();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$0.00"),
	).toBeVisible();
	for (const group of groups) {
		await signedExpect(page.getByRole("heading", { name: group })).toBeVisible();
	}
	await signedExpect(page.getByRole("button", { name: "Add account" })).toBeVisible();
	await signedExpect(page.getByRole("button", { name: "Refresh all" })).toBeVisible();
	await signedExpect(page.getByRole("button", { name: "Filters" })).toBeVisible();
	await signedExpect(page.getByRole("button", { name: "Totals" })).toBeVisible();
	await signedExpect(page.getByRole("button", { name: "Percent" })).toBeVisible();
	const panel = page.getByRole("complementary", { name: "Summary" });
	await signedExpect(panel.getByText("Assets")).toBeVisible();
	await signedExpect(panel.getByText("Liabilities")).toBeVisible();
	await signedExpect(panel.getByText("$0.00").first()).toBeVisible();
	await signedExpect(page.getByRole("grid")).toHaveCount(0);
	await signedExpect(page.getByText("Free", { exact: true })).toBeVisible();
});

test("GET accounts and net-worth are empty for a new User", async ({ page }) => {
	const accounts = await page.request.get("http://localhost:3000/api/accounts");
	signedExpect(accounts.status()).toBe(200);
	signedExpect(await accounts.json()).toEqual({ data: [] });

	const netWorth = await page.request.get("http://localhost:3000/api/accounts/net-worth");
	signedExpect(netWorth.status()).toBe(200);
	signedExpect(await netWorth.json()).toEqual({
		data: {
			current: 0,
			change: 0,
			changePercent: 0,
			baseCurrency: "USD",
			series: [],
			assets: [],
			liabilities: [],
			groups: [
				{ group: "cash", total: 0, change: 0 },
				{ group: "credit", total: 0, change: 0 },
				{ group: "investment", total: 0, change: 0 },
				{ group: "loan", total: 0, change: 0 },
				{ group: "vehicle", total: 0, change: 0 },
				{ group: "other", total: 0, change: 0 },
			],
		},
	});
});

async function addManual(
	page: Page,
	fields: {
		name: string;
		group?: string;
		type?: string;
		balance: string;
		currency?: string;
		creditLimit?: string;
	},
) {
	await page.getByRole("button", { name: "Add account" }).click();
	await page.getByRole("button", { name: "Add manually" }).click();
	await page.getByLabel("Name").fill(fields.name);
	if (fields.group) {
		await page.getByLabel("Display group").selectOption(fields.group);
	}
	if (fields.type) {
		await page.getByLabel("Type").selectOption(fields.type);
	}
	await page.getByLabel("Balance").fill(fields.balance);
	if (fields.currency) {
		await page.getByLabel("Currency").fill(fields.currency);
	}
	if (fields.creditLimit) {
		await page.getByLabel("Credit limit").fill(fields.creditLimit);
	}
	await page.getByRole("button", { name: "Save" }).click();
}

test("manual BankAccount appears in its group and moves net worth", async ({ page }) => {
	await page.goto("/accounts");
	await addManual(page, {
		name: "Emergency cash",
		group: "cash",
		type: "other",
		balance: "100.00",
	});
	await signedExpect(
		page.getByRole("region", { name: "Cash" }).getByText("Emergency cash"),
	).toBeVisible();
	await signedExpect(
		page.getByRole("button", { name: /Emergency cash/ }).getByText("$100.00"),
	).toBeVisible();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$100.00"),
	).toBeVisible();
	await signedExpect(
		page.getByRole("complementary", { name: "Summary" }).getByText("$100.00").first(),
	).toBeVisible();
});

test("hide omits a BankAccount from net worth and delete removes it", async ({ page }) => {
	await page.goto("/accounts");
	await addManual(page, { name: "Hidden cash", group: "cash", type: "other", balance: "50.00" });
	await page.getByRole("button", { name: "Hidden cash" }).click();
	await page.getByRole("checkbox", { name: "Hidden" }).check();
	await page.getByRole("button", { name: "Save" }).click();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$0.00"),
	).toBeVisible();
	await signedExpect(page.getByText("Hidden cash")).toBeVisible();
	await page.getByRole("button", { name: "Hidden cash" }).click();
	await page.getByRole("button", { name: "Delete" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
	await signedExpect(page.getByText("Hidden cash")).toHaveCount(0);
});

test("edit and unhide move net worth, and Filters stay in the URL", async ({ page }) => {
	await page.goto("/accounts");
	await addManual(page, { name: "Editable cash", group: "cash", type: "other", balance: "50.00" });
	await page.getByRole("button", { name: "Editable cash" }).click();
	await page.getByLabel("Balance").fill("80.00");
	await page.getByRole("button", { name: "Save" }).click();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$80.00"),
	).toBeVisible();
	await page.getByRole("button", { name: "Editable cash" }).click();
	await page.getByRole("checkbox", { name: "Hidden" }).check();
	await page.getByRole("button", { name: "Save" }).click();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$0.00"),
	).toBeVisible();
	await page.getByRole("button", { name: "Editable cash" }).click();
	await page.getByRole("checkbox", { name: "Hidden" }).uncheck();
	await page.getByRole("button", { name: "Save" }).click();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$80.00"),
	).toBeVisible();
	await page.getByLabel("Timeframe").selectOption("3m");
	await signedExpect(page).toHaveURL(/range=3m/);
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByLabel("Group").selectOption("vehicle");
	await signedExpect(page).toHaveURL(/group=vehicle/);
	await signedExpect(page.getByText("Editable cash")).toHaveCount(0);
});

test("unofficial currency is omitted from net worth with a banner", async ({ page }) => {
	await page.goto("/accounts");
	await addManual(page, {
		name: "Coin stash",
		group: "other",
		type: "other",
		balance: "10.00",
		currency: "BTC",
	});
	await signedExpect(page.getByText("Coin stash")).toBeVisible();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$0.00"),
	).toBeVisible();
	await signedExpect(page.getByRole("status")).toContainText(/omitted/i);
});

test("EUR manual BankAccount converts into a USD hero", async ({ page }) => {
	await seedFxRate("EUR", "USD", "1.1");
	await page.goto("/accounts");
	await addManual(page, {
		name: "Euro cash",
		group: "cash",
		type: "other",
		balance: "100.00",
		currency: "EUR",
	});
	await signedExpect(page.getByRole("region", { name: "Cash" }).getByText("€100.00")).toBeVisible();
	await signedExpect(
		page.getByRole("region", { name: "Net worth" }).getByText("$110.00"),
	).toBeVisible();
});

test("two Users do not see each other's BankAccounts", async ({ page, browser }) => {
	await page.goto("/accounts");
	await addManual(page, { name: "Only mine", group: "cash", type: "other", balance: "25.00" });
	const other = await browser.newPage();
	await signUp(other);
	await other.goto("/accounts");
	await signedExpect(other.getByText("Only mine")).toHaveCount(0);
	await signedExpect(
		other.getByRole("region", { name: "Net worth" }).getByText("$0.00"),
	).toBeVisible();
	await other.close();
});
