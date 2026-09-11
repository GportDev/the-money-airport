import { expect, test } from "@playwright/test";

test("home page shows Money Airport", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("main").getByText("Money Airport")).toBeVisible();
});
