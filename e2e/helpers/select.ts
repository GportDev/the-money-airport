import type { Locator, Page } from "@playwright/test";

/** Picks an option in one of the app's Radix selects: open the trigger, click the option. */
export async function chooseOption(page: Page, trigger: Locator, option: string | RegExp) {
	await trigger.click();
	await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
}
