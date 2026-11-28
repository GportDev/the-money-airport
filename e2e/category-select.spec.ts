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
	await expect(page.getByRole("option", { name: "Create “zzz”" })).toBeVisible();
	await expect(page.getByRole("option", { name: "Groceries" })).toHaveCount(0);

	await page.getByRole("combobox", { name: "Search categories" }).fill("din");
	await page.getByRole("option", { name: "Dining" }).click();
	await expect(picker).toHaveText("Dining");
});

test("opening a Category picker shows no focus ring around its search field", async ({ page }) => {
	await page.request.post(`${API}/transactions`, {
		data: {
			name: "Bus fare",
			amount: -300,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});

	await page.goto("/transactions");
	await page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Bus fare" })
		.click();
	const search = page.getByRole("combobox", { name: "Search categories" });
	await expect(search).toBeFocused();
	await expect(search).toHaveCSS("outline-style", "none");
});

test("the Category form's emoji picker searches every emoji and saves the pick", async ({
	page,
}) => {
	await page.goto("/transactions");
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Manage categories" }).click();
	const manager = page.getByRole("dialog");
	await manager.getByRole("button", { name: "New category" }).click();
	await manager.getByLabel("Name").fill("Pet food");

	await manager.getByRole("button", { name: "Icon" }).click();
	await page.getByRole("searchbox", { name: "Search emoji" }).fill("paw");
	await page.getByRole("gridcell", { name: "paw prints" }).click();
	await expect(manager.getByRole("button", { name: "Icon" })).toHaveText("🐾");

	await manager.getByRole("button", { name: "Create category" }).click();
	await expect(manager.getByRole("button", { name: "Pet food", exact: true })).toBeVisible();
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { name: string; icon: string }[] }).data;
	expect(rows.find((row) => row.name === "Pet food")?.icon).toBe("🐾");
});

test("a Category icon must be one emoji", async ({ page }) => {
	for (const icon of ["paw-print", "🐾🐶", "a"]) {
		const res = await page.request.post(`${API}/categories`, {
			data: { name: `Bad ${icon}`, icon },
		});
		expect(res.status(), icon).toBe(400);
	}
	for (const icon of ["🐾", "👩🏽‍💻", "🇧🇷", "1️⃣"]) {
		const res = await page.request.post(`${API}/categories`, {
			data: { name: `Ok ${icon}`, icon },
		});
		expect(res.status(), icon).toBe(201);
	}
});

test("typing a new name in a row's Category picker creates that Category and assigns it", async ({
	page,
}) => {
	const created = await page.request.post(`${API}/transactions`, {
		data: {
			name: "Vet visit",
			amount: -8000,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});
	const transactionId = ((await created.json()) as { data: { id: string } }).data.id;

	await page.goto("/transactions");
	const picker = page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Vet visit" });
	await picker.click();
	await page.getByRole("combobox", { name: "Search categories" }).fill("Pets");
	await page.getByRole("option", { name: "Create “Pets”" }).click();

	const drawer = page.getByRole("dialog");
	await expect(drawer.getByRole("heading", { name: "New category" })).toBeVisible();
	await expect(drawer.getByLabel("Name")).toHaveValue("Pets");
	await drawer.getByRole("button", { name: "Create category" }).click();

	await expect(page.getByText("Pets created")).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(picker).toHaveText(/Pets/);
	await expect
		.poll(async () => {
			const res = await page.request.get(`${API}/transactions/${transactionId}`);
			return ((await res.json()) as { data: { category: { name: string } | null } }).data.category
				?.name;
		})
		.toBe("Pets");
});

test("a row's Category picker offers no create option for an existing name", async ({ page }) => {
	await page.request.post(`${API}/transactions`, {
		data: {
			name: "Fresh Mart",
			amount: -900,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});

	await page.goto("/transactions");
	await page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Fresh Mart" })
		.click();
	await page.getByRole("combobox", { name: "Search categories" }).fill("dining");
	await expect(page.getByRole("option", { name: "Dining" })).toBeVisible();
	await expect(page.getByRole("option", { name: /^Create/ })).toHaveCount(0);
});

test("cancelling the new Category drawer leaves the transaction's Category alone", async ({
	page,
}) => {
	await page.request.post(`${API}/transactions`, {
		data: {
			name: "Book stall",
			amount: -1500,
			date: new Date().toISOString().slice(0, 10),
			categoryId: await categoryId(page, "Groceries"),
		},
	});

	await page.goto("/transactions");
	const picker = page
		.getByRole("list", { name: "Transactions" })
		.getByRole("combobox", { name: "Category for Book stall" });
	await picker.click();
	await page.getByRole("combobox", { name: "Search categories" }).fill("Books");
	await page.getByRole("option", { name: "Create “Books”" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(picker).toHaveText("Groceries");
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { name: string }[] }).data;
	expect(rows.some((row) => row.name === "Books")).toBe(false);
});
