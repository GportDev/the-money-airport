import { expect, test } from "./fixtures";

test("home page shows Money Airport", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("main").getByText("Money Airport")).toBeVisible();
});
