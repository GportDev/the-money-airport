import { expect, test } from "./fixtures";

const navItems = [
	{ name: "Dashboard", path: "/" },
	{ name: "Cash Flow", path: "/cash-flow" },
	{ name: "Accounts", path: "/accounts" },
	{ name: "Transactions", path: "/transactions" },
	{ name: "Reports", path: "/reports" },
	{ name: "Budget", path: "/budget" },
	{ name: "Recurring", path: "/recurring" },
	{ name: "Goals", path: "/goals" },
	{ name: "Investments", path: "/investments" },
	{ name: "Forecasting", path: "/forecast" },
] as const;

test("sidebar lists product screens in PRD order", async ({ page }) => {
	await page.goto("/");
	const nav = page.getByRole("navigation", { name: "Primary" });
	await expect(nav.getByRole("link")).toHaveText(navItems.map((item) => item.name));
});

test("each sidebar item changes the path and page title", async ({ page }) => {
	await page.goto("/");
	const nav = page.getByRole("navigation", { name: "Primary" });
	for (const item of navItems) {
		await nav.getByRole("link", { name: item.name }).click();
		await expect(page).toHaveURL(item.path);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(item.name);
	}
});

test("settings opens from the header gear and is not a sidebar row", async ({ page }) => {
	await page.goto("/");
	const nav = page.getByRole("navigation", { name: "Primary" });
	await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
	await page.getByRole("link", { name: "Settings" }).click();
	await expect(page).toHaveURL("/settings");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
});

test("reload on budget and back keep the shell in sync", async ({ page }) => {
	await page.goto("/");
	await page
		.getByRole("navigation", { name: "Primary" })
		.getByRole("link", { name: "Budget" })
		.click();
	await expect(page).toHaveURL("/budget");
	await page.reload();
	await expect(page).toHaveURL("/budget");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Budget");
	await page.goBack();
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
});

test("unknown paths stay inside the shell", async ({ page }) => {
	await page.goto("/no-such-screen");
	await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
});
