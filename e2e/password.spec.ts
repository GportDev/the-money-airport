import { expect, test } from "@playwright/test";
import { signUp } from "./helpers/auth";

test("forgot password shows a confirmation after submit", async ({ page }) => {
	await page.goto("/login");
	await page.getByRole("link", { name: "Forgot password" }).click();
	await page.getByLabel("Email").fill("anyone@example.com");
	await page.getByRole("button", { name: "Send reset link" }).click();
	await expect(
		page.getByText("If that email is in Money Airport, we accepted the request."),
	).toBeVisible();
});

test("signed-in User can change password and log in with the new one", async ({ page }) => {
	const { email, password } = await signUp(page);
	const nextPassword = "newpass1234";
	await page.goto("/settings");
	await page.getByLabel("Current password").fill(password);
	await page.getByLabel("New password").fill(nextPassword);
	await page.getByRole("button", { name: "Change password" }).click();
	await expect(page.getByText("Password changed.")).toBeVisible();
	await page.getByRole("button", { name: "Profile" }).click();
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await page.getByLabel("Password").fill(nextPassword);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
