import { expect, test } from "@playwright/test";
import { signUp } from "./helpers/auth";

test("visitor at home sees login, not the shell", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await expect(page.getByText("Money Airport")).toBeVisible();
	await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
});

test("visitor deep links go to login", async ({ page }) => {
	for (const path of ["/accounts", "/budget", "/settings"]) {
		await page.goto(path);
		await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
		await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
		await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
	}
});

test("signup with email lands on Dashboard with Free", async ({ page }) => {
	await signUp(page, { name: "Gabriel" });
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect(page.getByText("Free", { exact: true })).toBeVisible();
	await expect(page.getByText("Gabriel")).toBeVisible();
	await expect(page.getByRole("main").getByText("Money Airport")).toBeVisible();
	await expect(page.getByText("Trial")).toHaveCount(0);
});

test("session cookie is HTTP-only and survives refresh", async ({ page }) => {
	await signUp(page);
	const cookies = await page.context().cookies();
	const session = cookies.find((cookie) => cookie.name.includes("session_token"));
	expect(session?.httpOnly).toBe(true);
	await page.reload();
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login and signup bounce to Dashboard when already signed in", async ({ page }) => {
	await signUp(page);
	await page.goto("/login");
	await expect(page).toHaveURL("/");
	await page.goto("/signup");
	await expect(page).toHaveURL("/");
});

test("logout from Profile returns to login", async ({ page }) => {
	await signUp(page);
	await page.getByRole("button", { name: "Profile" }).click();
	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await page.goto("/budget");
	await expect(page).toHaveURL(/\/login/);
});

test("login with the same credentials reaches Dashboard", async ({ page }) => {
	const { email, password } = await signUp(page);
	await page.getByRole("button", { name: "Profile" }).click();
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("wrong password stays on login with an error", async ({ page }) => {
	const { email } = await signUp(page);
	await page.getByRole("button", { name: "Profile" }).click();
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("wrong-password");
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/login/);
});

test("duplicate signup email fails with a visible error", async ({ page }) => {
	const { email } = await signUp(page);
	await page.getByRole("button", { name: "Profile" }).click();
	await page.goto("/signup");
	await page.getByLabel("Name").fill("Other");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("password1234");
	await page.getByRole("button", { name: "Sign up" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/signup/);
});

test("short password is rejected with a visible error", async ({ page }) => {
	await page.goto("/signup");
	await page.getByLabel("Name").fill("Gabriel");
	await page.getByLabel("Email").fill(`short-${Date.now()}@example.com`);
	await page.getByLabel("Password").fill("short");
	await page.getByRole("button", { name: "Sign up" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/signup/);
});

test("login after a bounce returns to the requested path", async ({ page }) => {
	const { email, password } = await signUp(page);
	await page.getByRole("button", { name: "Profile" }).click();
	await page.goto("/budget");
	await expect(page).toHaveURL(/\/login/);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL("/budget");
});

test("Continue with Google is visible on login and signup", async ({ page }) => {
	await page.goto("/login");
	await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
	await page.goto("/signup");
	await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("health stays public", async ({ request }) => {
	const response = await request.get("http://localhost:3000/api/health");
	expect(response.status()).toBe(200);
});
