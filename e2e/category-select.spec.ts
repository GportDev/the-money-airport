import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const API = "http://localhost:3000/api";

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = rows.find((row) => row.name === name);
	if (!found) throw new Error(`No category ${name}`);
	return found.id;
}

test("a transaction's Category can be changed from the feed and is saved", async ({ page }) => {
	const account = await page.request.post(`${API}/accounts`, {
		data: {
			name: "Inline Checking",
			type: "checking",
			displayGroup: "cash",
			currentBalance: 50000,
		},
	});
	const bankAccountId = ((await account.json()) as { data: { id: string } }).data.id;
	const created = await page.request.post(`${API}/transactions`, {
		data: {
			name: "Corner Deli",
			amount: -1250,
			date: new Date().toISOString().slice(0, 10),
			bankAccountId,
			categoryId: await categoryId(page, "Groceries"),
		},
	});
	const transactionId = ((await created.json()) as { data: { id: string } }).data.id;

	await page.goto("/transactions");
	const picker = page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Corner Deli" });
	await expect(picker).toHaveText("Groceries");

	await picker.click();
	await page.getByRole("option", { name: "Dining" }).click();
	await expect(picker).toHaveText("Dining");
	// Picking a Category does not open the row's drawer.
	await expect(page.getByRole("dialog")).toHaveCount(0);

	await expect
		.poll(async () => {
			const res = await page.request.get(`${API}/transactions/${transactionId}`);
			return ((await res.json()) as { data: { category: { name: string } | null } }).data.category
				?.name;
		})
		.toBe("Dining");

	await page.reload();
	await expect(picker).toHaveText("Dining");

	// The rest of the row still opens the drawer.
	await page
		.getByRole("list", { name: "Transactions" })
		.getByRole("button", { name: /Corner Deli/ })
		.click({ position: { x: 60, y: 12 } });
	await expect(
		page.getByRole("dialog").getByRole("heading", { name: "Corner Deli" }),
	).toBeVisible();
});

test("typing in a Category picker narrows the list by name", async ({ page }) => {
	await page.request.post(`${API}/transactions`, {
		data: {
			name: "Night Market",
			amount: -900,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});

	await page.goto("/transactions");
	const picker = page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Night Market" });
	await picker.click();
	await page.getByRole("combobox", { name: "Search categories" }).fill("din");
	await expect(page.getByRole("option", { name: "Dining" })).toBeVisible();
	await expect(page.getByRole("option", { name: "Groceries" })).toHaveCount(0);

	await page.getByRole("combobox", { name: "Search categories" }).fill("zzz");
	await expect(page.getByText("No categories match.")).toBeVisible();

	await page.getByRole("combobox", { name: "Search categories" }).fill("din");
	await page.getByRole("option", { name: "Dining" }).click();
	await expect(picker).toHaveText("Dining");
});

test("the Category form's icon picker shows each icon beside its name", async ({ page }) => {
	await page.goto("/transactions");
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Manage categories" }).click();
	const manager = page.getByRole("dialog");
	await manager.getByRole("button", { name: "New category" }).click();
	await manager.getByLabel("Name").fill("Pet food");

	await manager.getByRole("combobox", { name: "Icon" }).click();
	const option = page.getByRole("option", { name: "Paw print" });
	await expect(option).toBeVisible();
	await expect(option.locator("svg").first()).toBeVisible();
	await option.click();
	await expect(manager.getByRole("combobox", { name: "Icon" })).toHaveText("Paw print");

	await manager.getByRole("button", { name: "Create category" }).click();
	await expect(manager.getByRole("button", { name: "Pet food", exact: true })).toBeVisible();
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { name: string; icon: string }[] }).data;
	expect(rows.find((row) => row.name === "Pet food")?.icon).toBe("paw-print");
});
