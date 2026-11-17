import { expect, type Page, test } from "@playwright/test";

const CLIENT_ORIGIN = "http://localhost:5173";

async function captureSocialSignIn(page: Page) {
	const request = page.waitForRequest("**/api/auth/sign-in/social");
	await page.route("**/api/auth/sign-in/social", (route) => route.abort());
	await page.getByRole("button", { name: "Continue with Google" }).click();
	return (await request).postDataJSON() as { callbackURL?: string; errorCallbackURL?: string };
}

test("Google from login returns to the requested page on the app origin", async ({ page }) => {
	await page.goto("/login?next=/budget");
	const body = await captureSocialSignIn(page);
	expect(body.callbackURL).toBe(`${CLIENT_ORIGIN}/budget`);
	expect(body.errorCallbackURL).toBe(`${CLIENT_ORIGIN}/login`);
});

test("Google from signup returns to Dashboard on the app origin", async ({ page }) => {
	await page.goto("/signup");
	const body = await captureSocialSignIn(page);
	expect(body.callbackURL).toBe(`${CLIENT_ORIGIN}/`);
	expect(body.errorCallbackURL).toBe(`${CLIENT_ORIGIN}/login`);
});

test("Google sign-in that cannot start shows an error toast", async ({ page }) => {
	await page.goto("/login");
	await captureSocialSignIn(page);
	await expect(page.getByText("Could not reach the server. Try again in a moment.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

test("closed sign-up from Google shows why on login", async ({ page }) => {
	await page.goto("/login?error=SIGNUP_CLOSED");
	await expect(page.getByText("Sign-ups are closed for this app.")).toBeVisible();
	await expect(page).toHaveURL(`${CLIENT_ORIGIN}/login`);
});

test("other Google errors show a generic message on login", async ({ page }) => {
	await page.goto("/login?error=state_mismatch&error_description=Injected%20text");
	await expect(page.getByText("Google sign-in failed. Try again.")).toBeVisible();
	await expect(page.getByText("Injected text")).toHaveCount(0);
});
