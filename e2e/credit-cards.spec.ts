import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";
const CARDS_ROUTE = /\/api\/credit-cards$/;

type EarnRuleInput = {
	label: string;
	ratePer100: number;
	categories: string[];
	merchants: string[];
	cap: null;
};
type CreditInput = {
	label: string;
	amount: number;
	period: string;
	categories: string[];
	merchants: string[];
};
type BenefitsInput = {
	productName: string;
	rewardCurrency: "cash_back" | "points" | "miles";
	unitValue: number;
	baseRatePer100: number;
	earnRules: EarnRuleInput[];
	credits: CreditInput[];
	perks: { label: string; description: string | null }[];
	annualFee: number | null;
};

function today() {
	return new Date().toISOString().slice(0, 10);
}

async function createCard(page: Page, name: string, extra: Record<string, unknown> = {}) {
	const res = await page.request.post(`${API}/accounts`, {
		data: { name, type: "credit", displayGroup: "credit", currentBalance: 0, ...extra },
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function setPreset(page: Page, accountId: string, presetKey: string) {
	const res = await page.request.put(`${API}/accounts/${accountId}/card-benefits`, {
		data: { presetKey },
	});
	expect(res.ok()).toBe(true);
}

async function setBenefits(page: Page, accountId: string, benefits: Partial<BenefitsInput>) {
	const res = await page.request.put(`${API}/accounts/${accountId}/card-benefits`, {
		data: {
			benefits: {
				productName: "Custom card",
				rewardCurrency: "cash_back",
				unitValue: 100,
				baseRatePer100: 100,
				earnRules: [],
				credits: [],
				perks: [],
				annualFee: null,
				...benefits,
			},
		},
	});
	expect(res.ok()).toBe(true);
}

async function charge(page: Page, accountId: string, name: string, cents: number) {
	const res = await page.request.post(`${API}/transactions`, {
		data: { name, amount: -cents, date: today(), bankAccountId: accountId },
	});
	expect(res.status()).toBe(201);
}

function tileFor(page: Page, name: string) {
	return page
		.getByRole("list", { name: "Credit cards" })
		.getByRole("listitem")
		.filter({ hasText: name });
}

/** The card's accordion header; the grip beside it has no expanded state. */
function selectButton(tile: Locator) {
	return tile
		.getByRole("button", { expanded: true })
		.or(tile.getByRole("button", { expanded: false }));
}

async function expectCardOrder(page: Page, names: string[]) {
	const headers = page.getByRole("list", { name: "Credit cards" }).getByRole("heading");
	await expect(headers).toHaveText(names.map((name) => new RegExp(`^${name}`)));
}

function benefitsPanel(page: Page) {
	return page.getByRole("region", { name: "Benefits" });
}

function billingPeriod(page: Page) {
	return page.getByRole("region", { name: "Billing period" });
}

test("sidebar link opens the Credit Cards page", async ({ page }) => {
	await page.goto("/");
	await page
		.getByRole("navigation", { name: "Primary" })
		.getByRole("link", { name: "Credit Cards" })
		.click();
	await expect(page).toHaveURL("/credit-cards");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Credit Cards");
});

test("shows an empty state linking to Accounts when there are no credit cards", async ({
	page,
}) => {
	await page.goto("/credit-cards");
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { name: "No credit cards yet" })).toBeVisible();
	await main.getByRole("link", { name: "Go to Accounts" }).click();
	await expect(page).toHaveURL("/accounts");
});

test("a card tile shows balance, available credit, limit, usage, and APR", async ({ page }) => {
	const visa = await createCard(page, "Visa", { currentBalance: 25_000, creditLimit: 100_000 });
	const patched = await page.request.patch(`${API}/accounts/${visa}`, { data: { aprBps: 2_499 } });
	expect(patched.status()).toBe(200);

	await page.goto("/credit-cards");
	const tile = tileFor(page, "Visa");
	await expect(selectButton(tile)).toHaveAttribute("aria-expanded", "true");
	await expect(tile).toContainText("$250.00");
	await expect(tile).toContainText("Available credit");
	await expect(tile).toContainText("$750.00");
	await expect(tile).toContainText("Credit limit");
	await expect(tile).toContainText("$1,000.00");
	await expect(tile).toContainText("25%");
	await expect(tile.getByRole("progressbar", { name: "Visa usage" })).toBeVisible();
	await expect(tile).toContainText("24.99%");
	await expect(tile).toContainText("No card product");
	await expect(tile).not.toContainText(/null|NaN/);
});

test("a card without a limit or APR shows placeholders, never null", async ({ page }) => {
	await createCard(page, "Store card", { currentBalance: 4_000 });
	await page.goto("/credit-cards");
	const tile = tileFor(page, "Store card");
	await expect(tile).toContainText("$40.00");
	await expect(tile).toContainText("Add APR");
	await expect(tile).toContainText("—");
	await expect(tile).not.toContainText(/null|NaN/);
	await expect(tile.getByRole("progressbar")).toHaveCount(0);
});

test("picking a Card product toasts, names it on the tile, and tracks cash back", async ({
	page,
}) => {
	const visa = await createCard(page, "Visa");
	await page.goto("/credit-cards");
	const tile = tileFor(page, "Visa");
	const benefits = benefitsPanel(page);
	await expect(tile).toContainText("No card product");

	await benefits.getByRole("combobox", { name: "Card product" }).click();
	await page.getByRole("option", { name: "Generic · Flat 2% cash back" }).click();
	await expect(page.getByText("Card product set to Flat 2% cash back")).toBeVisible();
	await expect(tile).toContainText("Flat 2% cash back");
	await expect(tile).not.toContainText("No card product");
	await expect(benefits).toContainText("This month");
	await expect(benefits).toContainText("Year to date");

	await charge(page, visa, "Hardware store", 5_000);
	await page.reload();
	await expect(tile).toContainText("$1.00 cash back");
	await expect(benefits.getByRole("table", { name: "Earn breakdown" })).toContainText("2%");
});

test("removing the Card product goes back to the prompt", async ({ page }) => {
	const visa = await createCard(page, "Visa");
	await setPreset(page, visa, "flat-cash-back-2");
	await page.goto("/credit-cards");
	const tile = tileFor(page, "Visa");
	const benefits = benefitsPanel(page);
	await expect(tile).toContainText("Flat 2% cash back");

	await benefits.getByRole("combobox", { name: "Card product" }).click();
	await page.getByRole("option", { name: "No card product" }).click();
	await expect(page.getByText("Card product removed")).toBeVisible();
	await expect(tile).toContainText("No card product");
	await expect(benefits).not.toContainText("This month");
});

test("a points card shows units earned and their estimated value", async ({ page }) => {
	const travel = await createCard(page, "Travel card");
	await setBenefits(page, travel, {
		productName: "Travel Points",
		rewardCurrency: "points",
		unitValue: 125,
		baseRatePer100: 100,
		earnRules: [
			{ label: "Airline", ratePer100: 300, categories: [], merchants: ["Skyline Air"], cap: null },
		],
	});
	await charge(page, travel, "Skyline Air", 10_000);

	await page.goto("/credit-cards");
	const tile = tileFor(page, "Travel card");
	await expect(tile).toContainText("Travel Points");
	await expect(tile).toContainText("300 pts ≈ $3.75");
	const breakdown = benefitsPanel(page).getByRole("table", { name: "Earn breakdown" });
	const airline = breakdown.getByRole("row").filter({ hasText: "Airline" });
	await expect(airline).toContainText("3x");
	await expect(airline).toContainText("$100.00");
	await expect(airline).toContainText("300 pts");
	await expect(airline).toContainText("$3.75");
});

test("a Benefit credit shows how much of it is used", async ({ page }) => {
	const gold = await createCard(page, "Gold card");
	await setBenefits(page, gold, {
		productName: "Dining Gold",
		credits: [
			{
				label: "Dining credit",
				amount: 1_500,
				period: "month",
				categories: [],
				merchants: ["Bistro"],
			},
		],
	});
	await charge(page, gold, "Bistro", 1_000);

	await page.goto("/credit-cards");
	const benefits = benefitsPanel(page);
	const credit = benefits.getByRole("listitem").filter({ hasText: "Dining credit" });
	await expect(credit).toContainText("$10.00 of $15.00 used");
	await expect(credit.getByRole("progressbar", { name: "Dining credit used" })).toBeVisible();
});

test("the billing period lists today's charges and the period total", async ({ page }) => {
	const visa = await createCard(page, "Visa");
	await charge(page, visa, "Coffee shop", 5_000);
	await charge(page, visa, "Book store", 2_000);

	await page.goto("/credit-cards");
	const period = billingPeriod(page);
	const coffee = period.getByRole("listitem").filter({ hasText: "Coffee shop" });
	await expect(coffee).toContainText("-$50.00");
	await expect(period.getByRole("listitem").filter({ hasText: "Book store" })).toContainText(
		"-$20.00",
	);
	await expect(period).toContainText("Period total");
	await expect(period).toContainText("-$70.00");
	await expect(period.getByRole("button", { name: "Next statement" })).toBeDisabled();
});

test("an empty billing period says there are no charges", async ({ page }) => {
	await createCard(page, "Visa");
	await page.goto("/credit-cards");
	await expect(billingPeriod(page)).toContainText("No charges in this period.");
});

test("a charge that would earn more on another card is marked Better with that card", async ({
	page,
}) => {
	const alpha = await createCard(page, "Alpha");
	const bravo = await createCard(page, "Bravo");
	await setPreset(page, alpha, "flat-cash-back-1");
	await setBenefits(page, bravo, {
		productName: "Cafe Rewards",
		earnRules: [
			{ label: "Cafes", ratePer100: 300, categories: [], merchants: ["Cafe"], cap: null },
		],
	});
	await charge(page, alpha, "Cafe", 4_000);
	await charge(page, bravo, "Cafe", 6_000);

	await page.goto(`/credit-cards?card=${alpha}`);
	const period = billingPeriod(page);
	const onAlpha = period.getByRole("listitem").filter({ hasText: "-$40.00" });
	await expect(onAlpha.getByText("Better with Bravo")).toBeVisible();
	await expect(onAlpha).toContainText("+$0.80");

	await selectButton(tileFor(page, "Bravo")).click();
	const onBravo = period.getByRole("listitem").filter({ hasText: "-$60.00" });
	await expect(onBravo).toBeVisible();
	await expect(period.getByText("Better with")).toHaveCount(0);

	await page.goto("/transactions");
	const feed = page.getByRole("list", { name: "Transactions" });
	await expect(feed.getByRole("button", { name: /Cafe/ })).toHaveCount(2);
	await expect(feed.getByRole("button", { name: /Cafe.*Better with Bravo/ })).toHaveCount(1);
	await expect(feed.getByText("Better with Bravo")).toHaveCount(1);
	await expect(feed.getByText("Better with Alpha")).toHaveCount(0);
});

test("selecting another tile updates the URL and the selected card's panels", async ({ page }) => {
	const alpha = await createCard(page, "Alpha");
	const bravo = await createCard(page, "Bravo");
	await setPreset(page, alpha, "flat-cash-back-1");
	await setPreset(page, bravo, "flat-cash-back-2");
	await charge(page, alpha, "Alpha only charge", 1_000);
	await charge(page, bravo, "Bravo only charge", 2_000);

	await page.goto("/credit-cards");
	const picker = benefitsPanel(page).getByRole("combobox", { name: "Card product" });
	const period = billingPeriod(page);

	await selectButton(tileFor(page, "Bravo")).click();
	await expect(page).toHaveURL(new RegExp(`[?&]card=${bravo}`));
	await expect(selectButton(tileFor(page, "Bravo"))).toHaveAttribute("aria-expanded", "true");
	await expect(selectButton(tileFor(page, "Alpha"))).toHaveAttribute("aria-expanded", "false");
	await expect(picker).toHaveText("Generic · Flat 2% cash back");
	await expect(period).toContainText("Bravo only charge");
	await expect(period).not.toContainText("Alpha only charge");

	await selectButton(tileFor(page, "Alpha")).click();
	await expect(page).toHaveURL(new RegExp(`[?&]card=${alpha}`));
	await expect(selectButton(tileFor(page, "Alpha"))).toHaveAttribute("aria-expanded", "true");
	await expect(picker).toHaveText("Generic · Flat 1% cash back");
	await expect(period).toContainText("Alpha only charge");

	await page.reload();
	await expect(selectButton(tileFor(page, "Alpha"))).toHaveAttribute("aria-expanded", "true");
});

test("an open card shows its details; the others show only name and balance", async ({ page }) => {
	await createCard(page, "Alpha", { currentBalance: 1_000, creditLimit: 50_000 });
	await createCard(page, "Bravo", { currentBalance: 2_500, creditLimit: 80_000 });
	await page.goto("/credit-cards");

	const bravo = tileFor(page, "Bravo");
	await expect(selectButton(bravo)).toHaveAttribute("aria-expanded", "false");
	await expect(selectButton(bravo)).toHaveText(/Bravo.*\$25\.00/);
	await expect(bravo).not.toContainText("Available credit");
	await expect(bravo).not.toContainText("APR");
	await expect(tileFor(page, "Alpha")).toContainText("Available credit");

	await selectButton(bravo).click();
	await expect(bravo).toContainText("Available credit");
	await expect(tileFor(page, "Alpha")).not.toContainText("Available credit");
});

test("dragging a card by its grip reorders the stack and the order is saved", async ({ page }) => {
	await createCard(page, "Alpha");
	await createCard(page, "Bravo");
	await createCard(page, "Charlie");
	await page.goto("/credit-cards");
	await expectCardOrder(page, ["Alpha", "Bravo", "Charlie"]);

	const saved = page.waitForResponse(
		(res) => res.url().endsWith("/api/credit-cards/order") && res.ok(),
	);
	await page
		.getByRole("button", { name: "Reorder Charlie" })
		.dragTo(selectButton(tileFor(page, "Alpha")), { targetPosition: { x: 20, y: 4 } });
	await expectCardOrder(page, ["Charlie", "Alpha", "Bravo"]);
	await saved;

	await page.reload();
	await expectCardOrder(page, ["Charlie", "Alpha", "Bravo"]);
});

test("Arrow keys on a card's grip move it one place", async ({ page }) => {
	await createCard(page, "Alpha");
	await createCard(page, "Bravo");
	await page.goto("/credit-cards");

	const grip = page.getByRole("button", { name: "Reorder Bravo" });
	await grip.focus();
	await page.keyboard.press("ArrowUp");
	await expectCardOrder(page, ["Bravo", "Alpha"]);
	await expect(grip).toBeFocused();
	await page.keyboard.press("ArrowUp");
	await expectCardOrder(page, ["Bravo", "Alpha"]);
	await page.keyboard.press("ArrowDown");
	await expectCardOrder(page, ["Alpha", "Bravo"]);
	await expect(grip).toBeFocused();
	await page.keyboard.press("ArrowUp");
	await expectCardOrder(page, ["Bravo", "Alpha"]);

	await expect
		.poll(async () => {
			const res = await page.request.get(`${API}/credit-cards`);
			return ((await res.json()) as { data: { name: string }[] }).data.map((card) => card.name);
		})
		.toEqual(["Bravo", "Alpha"]);
});

test("a failed reorder puts the cards back and says so", async ({ page }) => {
	await createCard(page, "Alpha");
	await createCard(page, "Bravo");
	await page.route(/\/api\/credit-cards\/order$/, (route) =>
		route.fulfill({ status: 500, json: { message: "Boom" } }),
	);
	await page.goto("/credit-cards");

	await page.getByRole("button", { name: "Reorder Bravo" }).focus();
	await page.keyboard.press("ArrowUp");
	await expect(page.getByText("Could not save the card order")).toBeVisible();
	await expectCardOrder(page, ["Alpha", "Bravo"]);
});

test("another User cannot reorder my cards", async ({ page }) => {
	const alpha = await createCard(page, "Alpha");
	const bravo = await createCard(page, "Bravo");
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	try {
		const other = await context.newPage();
		await signUp(other);
		const res = await other.request.put(`${API}/credit-cards/order`, {
			data: { accountIds: [bravo, alpha] },
		});
		expect(res.ok()).toBe(true);
	} finally {
		await context.close();
	}
	const res = await page.request.get(`${API}/credit-cards`);
	const names = ((await res.json()) as { data: { name: string }[] }).data.map((card) => card.name);
	expect(names).toEqual(["Alpha", "Bravo"]);
});

test("the order endpoint rejects a malformed or repeated list", async ({ page }) => {
	const alpha = await createCard(page, "Alpha");
	for (const data of [{}, { accountIds: ["nope"] }, { accountIds: [alpha, alpha] }]) {
		const res = await page.request.put(`${API}/credit-cards/order`, { data });
		expect(res.status()).toBe(400);
	}
});

test("a failed load shows Try again, which recovers once the API is back", async ({ page }) => {
	await createCard(page, "Visa");
	await page.route(CARDS_ROUTE, (route) =>
		route.fulfill({ status: 500, json: { message: "Boom" } }),
	);
	await page.goto("/credit-cards");
	const alert = page.getByRole("alert").filter({ hasText: "Could not load credit cards." });
	await expect(alert).toBeVisible();
	await page.unroute(CARDS_ROUTE);
	await alert.getByRole("button", { name: "Try again" }).click();
	await expect(alert).toHaveCount(0);
	await expect(tileFor(page, "Visa")).toBeVisible();
});

test("the page shows a skeleton while credit cards load", async ({ page }) => {
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(CARDS_ROUTE, async (route) => {
		await gate;
		await route.continue();
	});
	await page.goto("/credit-cards");
	const skeleton = page.getByRole("status", { name: "Loading credit cards", exact: true });
	await expect(skeleton).toBeVisible();
	release();
	await expect(skeleton).toHaveCount(0);
});
