import { test as base } from "@playwright/test";
import { signUp } from "./helpers/auth";

export { expect } from "@playwright/test";

export const test = base.extend({
	page: async ({ page }, use) => {
		await signUp(page);
		await use(page);
	},
});
