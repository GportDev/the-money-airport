import { expect, type Page } from "@playwright/test";

export async function signUp(
	page: Page,
	input?: { email?: string; password?: string; name?: string },
) {
	const email =
		input?.email ?? `founder-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
	const password = input?.password ?? "password1234";
	const name = input?.name ?? "Gabriel";
	await page.goto("/signup");
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign up" }).click();
	await expect(page).toHaveURL("/");
	return { email, password, name };
}

/** Profile signs out and then reloads on /login; wait for that page before acting. */
export async function logOut(page: Page) {
	await page.getByRole("button", { name: "Profile" }).click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
}
