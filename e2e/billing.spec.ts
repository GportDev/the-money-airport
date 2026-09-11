import { expect, test } from "@playwright/test";
import { signUp } from "./helpers/auth";

test("signup still reaches Dashboard when Stripe is unset", async ({ page }) => {
	await signUp(page);
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect(page.getByText("Free", { exact: true })).toBeVisible();
});

test("unsigned billing webhook is rejected", async ({ request }) => {
	const response = await request.post("http://localhost:3000/api/billing/webhook", {
		data: { type: "ping" },
	});
	expect(response.status()).toBe(400);
});
