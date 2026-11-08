import { expect, test } from "./fixtures";

test("home page greets the User and offers to connect an account", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText(/^Good (morning|afternoon|evening), Gabriel!$/)).toBeVisible();
	await expect(page.getByRole("heading", { name: "Connect an account" })).toBeVisible();
});
