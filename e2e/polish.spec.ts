import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const API = "http://localhost:3000/api";

const PAGES = [
	{ path: "/", name: "dashboard", api: /\/api\/dashboard\?/ },
	{ path: "/cash-flow", name: "cash flow", api: /\/api\/cash-flow\?/ },
	{ path: "/accounts", name: "accounts", api: /\/api\/accounts(\?|$)/ },
	{ path: "/transactions", name: "transactions", api: /\/api\/transactions\?/ },
	{ path: "/reports", name: "reports", api: /\/api\/accounts(\?|$)/ },
	{ path: "/budget", name: "budget", api: /\/api\/budgets\?/ },
	{ path: "/goals", name: "goals", api: /\/api\/goals(\?|$)/ },
	{ path: "/investments", name: "investments", api: /\/api\/investments\?/ },
	{ path: "/settings", name: "settings", api: /\/api\/settings$/ },
] as const;

const ALL_PATHS = [...PAGES.map((page) => page.path), "/recurring", "/forecast"];

/** Holds matching requests until the returned release() is called. */
async function holdRequests(page: Page, pattern: RegExp) {
	let release: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(pattern, async (route) => {
		await gate;
		await route.continue();
	});
	return release;
}

test("every data page shows a skeleton while it loads", async ({ page }) => {
	for (const target of PAGES) {
		const release = await holdRequests(page, target.api);
		await page.goto(target.path);
		const skeleton = page.getByRole("status", { name: `Loading ${target.name}`, exact: true });
		await expect(skeleton, target.path).toBeVisible();
		await expect(page.getByText("Loading…"), target.path).toHaveCount(0);
		release();
		await expect(skeleton, target.path).toHaveCount(0);
		await page.unroute(target.api);
	}
});

test("report cards show their own skeletons", async ({ page }) => {
	const release = await holdRequests(page, /\/api\/reports\//);
	await page.request.post(`${API}/accounts`, {
		data: { name: "Checking", type: "checking", displayGroup: "cash", currentBalance: 0 },
	});
	await page.goto("/reports");
	await expect(page.getByRole("status", { name: "Loading Spending by category" })).toBeVisible();
	release();
	await expect(page.getByRole("status", { name: "Loading Spending by category" })).toHaveCount(0);
});

test("a failed query shows Try again, which recovers once the API is back", async ({ page }) => {
	await page.route(/\/api\/investments\?/, (route) =>
		route.fulfill({ status: 500, json: { message: "Boom" } }),
	);
	await page.goto("/investments");
	const alert = page.getByRole("alert").filter({ hasText: "Could not load investments." });
	await expect(alert).toBeVisible();
	await page.unroute(/\/api\/investments\?/);
	await alert.getByRole("button", { name: "Try again" }).click();
	await expect(page.getByText("No investment accounts yet.")).toBeVisible();
	await expect(alert).toHaveCount(0);
});

test("a render crash shows the error page inside the app shell", async ({ page }) => {
	await page.route(/\/api\/dashboard\?/, (route) =>
		route.fulfill({ json: { data: { hasAccounts: true, widgets: null, baseCurrency: "USD" } } }),
	);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
	await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
	await page.unroute(/\/api\/dashboard\?/);
	await page
		.getByRole("navigation", { name: "Primary" })
		.getByRole("link", { name: "Accounts" })
		.click();
	await expect(page.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
});

test("Refresh all reports progress and result in a toast", async ({ page }) => {
	await page.goto("/accounts");
	await page.getByRole("button", { name: "Refresh all" }).click();
	await expect(page.getByText("Accounts refreshed")).toBeVisible();
});

test("Cash Flow empty month offers Add transaction", async ({ page }) => {
	await page.goto("/cash-flow?month=2025-03");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No transactions in March 2025." })).toBeVisible();
	await main.getByRole("button", { name: "Add transaction" }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
});

test("Accounts empty state opens the add-account chooser", async ({ page }) => {
	await page.goto("/accounts");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No accounts yet" })).toBeVisible();
	await main.getByRole("button", { name: "Add your first account" }).click();
	await expect(page.getByRole("dialog", { name: "Add account" })).toBeVisible();
});

test("Transactions empty states: add, then clear filters", async ({ page }) => {
	await page.goto("/transactions");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No transactions yet." })).toBeVisible();
	await main.getByRole("button", { name: "Add transaction" }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);

	await page.getByLabel("Search transactions").fill("zzz");
	await expect(page).toHaveURL(/search=zzz/);
	await expect(
		main.getByRole("heading", { name: "No transactions match these filters." }),
	).toBeVisible();
	await main.getByRole("button", { name: "Clear filters" }).click();
	await expect(page).not.toHaveURL(/search=/);
	await expect(page.getByLabel("Search transactions")).toHaveValue("");
	await expect(main.getByRole("heading", { name: "No transactions yet." })).toBeVisible();
});

test("Reports without accounts points to Accounts", async ({ page }) => {
	await page.goto("/reports");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No accounts yet" })).toBeVisible();
	await expect(main.getByRole("region", { name: "Spending by category" })).toHaveCount(0);
	await main.getByRole("link", { name: "Go to Accounts" }).click();
	await expect(page).toHaveURL("/accounts");
});

test("Budget month with no plans offers copy from the previous month", async ({ page }) => {
	await page.goto("/budget?month=2025-03");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No plans for March" })).toBeVisible();
	await main.getByRole("button", { name: "Copy from February" }).click();
	await expect(page.getByRole("alertdialog")).toContainText("Copy February plans");
});

test("below 1280px the summary panel stacks under main; wide screens put it beside", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1024, height: 800 });
	await page.goto("/accounts");
	const main = page.getByRole("main");
	const panel = page.getByRole("complementary", { name: "Summary" });
	await expect(panel).toBeVisible();
	const mainBox = await main.boundingBox();
	const panelBox = await panel.boundingBox();
	if (!mainBox || !panelBox) throw new Error("missing layout boxes");
	expect(panelBox.y).toBeGreaterThanOrEqual(mainBox.y + mainBox.height - 1);
	expect(Math.abs(panelBox.width - mainBox.width)).toBeLessThanOrEqual(1);

	await page.setViewportSize({ width: 1440, height: 900 });
	const wideMain = await main.boundingBox();
	const widePanel = await panel.boundingBox();
	if (!wideMain || !widePanel) throw new Error("missing layout boxes");
	expect(widePanel.x).toBeGreaterThanOrEqual(wideMain.x + wideMain.width - 1);
	expect(widePanel.width).toBe(320);
});

test("at 375px the sidebar is an icon rail and no page scrolls sideways", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	for (const path of ALL_PATHS) {
		await page.goto(path);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		const sidebar = page.getByRole("complementary", { name: "Workspace" });
		await expect(sidebar).toHaveCSS("width", "64px");
		const link = sidebar.getByRole("link", { name: "Accounts" });
		await expect(link).toBeVisible();
		await expect(link.getByText("Accounts")).not.toBeVisible();
		const overflow = await page.evaluate(() => {
			const scroller = document.querySelector("[data-testid=page-scroll]");
			return {
				document: document.documentElement.scrollWidth - window.innerWidth,
				content: scroller ? scroller.scrollWidth - scroller.clientWidth : 0,
			};
		});
		expect(overflow, path).toEqual({ document: 0, content: 0 });
	}
});
