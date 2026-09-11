import { expect, test } from "@playwright/test";

const withPanel = ["/accounts", "/budget", "/goals"];
const withoutPanel = [
	"/",
	"/cash-flow",
	"/transactions",
	"/reports",
	"/recurring",
	"/investments",
	"/forecast",
	"/settings",
];

test("footer shows Free and profile, not Trial or assistant chrome", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Free", { exact: true })).toBeVisible();
	await expect(page.getByText("Profile", { exact: true })).toBeVisible();
	await expect(page.getByText("Trial")).toHaveCount(0);
	await expect(page.getByText("AI Assistant")).toHaveCount(0);
	await expect(page.getByText("Help", { exact: true })).toHaveCount(0);
});

test("sidebar collapse still navigates", async ({ page }) => {
	await page.goto("/");
	const sidebar = page.getByRole("complementary", { name: "Workspace" });
	await expect(sidebar).toHaveCSS("width", "240px");
	await page.getByRole("button", { name: "Collapse sidebar" }).click();
	await expect(sidebar).toHaveCSS("width", "64px");
	await page
		.getByRole("navigation", { name: "Primary" })
		.getByRole("link", { name: "Accounts" })
		.click();
	await expect(page).toHaveURL("/accounts");
});

test("right summary panel only on accounts, budget, and goals", async ({ page }) => {
	for (const path of withPanel) {
		await page.goto(path);
		await expect(page.getByRole("complementary", { name: "Summary" })).toBeVisible();
	}
	for (const path of withoutPanel) {
		await page.goto(path);
		await expect(page.getByRole("complementary", { name: "Summary" })).toHaveCount(0);
	}
});

test("main column is not a spreadsheet grid", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("grid")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("Money Airport")).toBeVisible();
});

test("narrow viewport uses a 64px sidebar", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await expect(page.getByRole("complementary", { name: "Workspace" })).toHaveCSS("width", "64px");
});
