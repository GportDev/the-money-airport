import { expect, test } from "./fixtures";
import { logOut } from "./helpers/auth";

const SECTIONS = [
	"Profile",
	"Accounts",
	"Categories",
	"Dashboard",
	"Budget",
	"Plan",
	"Currency",
	"Data",
];

test("Settings opens from the gear and stacks its sections in spec order", async ({ page }) => {
	await page.getByRole("link", { name: "Settings" }).click();
	await expect(page).toHaveURL("/settings");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 2 })).toHaveText(SECTIONS);
	await expect(
		page.getByRole("region", { name: "Plan" }).getByLabel("Safety buffer"),
	).toBeVisible();
});

test("Profile shows email read-only and saves a new name", async ({ page }) => {
	await page.goto("/settings");
	const profile = page.getByRole("region", { name: "Profile" });
	await expect(profile.getByLabel("Email")).toHaveAttribute("readonly", "");
	await expect(profile.getByLabel("Email")).toHaveValue(/@example\.com$/);
	await expect(profile.getByText("G", { exact: true })).toBeVisible();

	await profile.getByLabel("Name").fill("Ana Souza");
	await profile.getByRole("button", { name: "Save name" }).click();
	await expect(page.getByText("Name saved")).toBeVisible();
	await page.reload();
	await expect(page.getByRole("region", { name: "Profile" }).getByLabel("Name")).toHaveValue(
		"Ana Souza",
	);
	await expect(page.getByRole("complementary", { name: "Workspace" })).toContainText("Ana Souza");
});

test("Profile changes the password and reports a wrong current password", async ({ page }) => {
	await page.goto("/settings");
	const profile = page.getByRole("region", { name: "Profile" });
	await profile.getByLabel("Current password").fill("not-the-password");
	await profile.getByLabel("New password").fill("newpassword1234");
	await profile.getByRole("button", { name: "Change password" }).click();
	await expect(page.getByText(/Invalid password/i)).toBeVisible();

	await profile.getByLabel("Current password").fill("password1234");
	await profile.getByLabel("New password").fill("newpassword1234");
	await profile.getByRole("button", { name: "Change password" }).click();
	await expect(page.getByText("Password changed")).toBeVisible();
	await expect(profile.getByLabel("Current password")).toHaveValue("");
	await logOut(page);
});

test("Accounts shortcut links to the Accounts page", async ({ page }) => {
	await page.goto("/settings");
	await page
		.getByRole("region", { name: "Accounts" })
		.getByRole("link", { name: "Manage accounts" })
		.click();
	await expect(page).toHaveURL("/accounts");
});

test("Categories opens the category manager drawer", async ({ page }) => {
	await page.goto("/settings");
	await page
		.getByRole("region", { name: "Categories" })
		.getByRole("button", { name: "Manage categories" })
		.click();
	await expect(page.getByRole("dialog", { name: "Categories" })).toBeVisible();
});

test("Dashboard widgets open the Customize drawer and persist", async ({ page }) => {
	await page.goto("/settings");
	await page
		.getByRole("region", { name: "Dashboard" })
		.getByRole("button", { name: "Customize widgets" })
		.click();
	const drawer = page.getByRole("dialog", { name: "Customize dashboard" });
	await drawer.getByLabel("Spending", { exact: true }).uncheck();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Dashboard updated")).toBeVisible();
	const res = await page.request.get("http://localhost:3000/api/settings");
	const body = (await res.json()) as {
		data: { dashboardWidgets: { id: string; visible: boolean }[] };
	};
	expect(body.data.dashboardWidgets.find((widget) => widget.id === "spending")?.visible).toBe(
		false,
	);
});

test("Budget copy-forward toggle persists", async ({ page }) => {
	await page.goto("/settings");
	const toggle = page.getByRole("region", { name: "Budget" }).getByLabel("Copy forward each month");
	await expect(toggle).not.toBeChecked();
	await toggle.click();
	await expect(page.getByText("Copy forward on")).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("region", { name: "Budget" }).getByLabel("Copy forward each month"),
	).toBeChecked();
});

test("Base currency change persists and reaches Accounts", async ({ page }) => {
	await page.goto("/settings");
	const currency = page.getByRole("region", { name: "Currency" }).getByLabel("Base currency");
	await expect(currency).toHaveText("USD");
	await currency.click();
	await page.getByRole("option", { name: "EUR" }).click();
	await expect(page.getByText("Base currency set to EUR")).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("region", { name: "Currency" }).getByLabel("Base currency"),
	).toHaveText("EUR");
	await page.goto("/accounts");
	await expect(page.getByRole("region", { name: "Net worth" }).getByText("€0.00")).toBeVisible();
});

test("a failed settings load shows Try again", async ({ page }) => {
	await page.route(/\/api\/settings$/, (route) =>
		route.fulfill({ status: 500, json: { message: "Boom" } }),
	);
	await page.goto("/settings");
	const alert = page.getByRole("alert").filter({ hasText: "Could not load settings." });
	await expect(alert).toBeVisible();
	await page.unroute(/\/api\/settings$/);
	await alert.getByRole("button", { name: "Try again" }).click();
	await expect(page.getByRole("region", { name: "Currency" })).toBeVisible();
});
