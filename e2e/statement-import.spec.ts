import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";
const FILES = path.join(__dirname, "statement-files");
const SYNCHRONY_QFX = path.join(FILES, "synchrony-2026-10.qfx");
const APPLE_OFX = path.join(FILES, "apple-card-2026-09.ofx");
const NOT_OFX = path.join(FILES, "not-a-statement.csv");

type Line = { fitId: string; date: string; amount: number; name: string };
type Row = {
	id: string;
	name: string;
	date: string;
	amount: number;
	category: { id: string; name: string } | null;
	isStatementConfirmed: boolean;
	isNotOnStatement: boolean;
};
type Preview = {
	statement: {
		periodStart: string;
		periodEnd: string;
		statementBalance: number | null;
		minimumPayment: number | null;
		dueDate: string | null;
	};
	matched: { line: Line; transaction: Row }[];
	newLines: Line[];
	notOnStatement: Row[];
	alreadyImported: Line[];
};

function file(name: string) {
	return readFileSync(name, "utf8");
}

async function createCard(page: Page, name: string) {
	const res = await page.request.post(`${API}/accounts`, {
		data: { name, type: "credit", displayGroup: "credit", currentBalance: 0 },
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function categoryId(page: Page, name: string) {
	const res = await page.request.get(`${API}/categories`);
	const rows = ((await res.json()) as { data: { id: string; name: string }[] }).data;
	const found = rows.find((row) => row.name === name);
	if (!found) throw new Error(`No ${name} Category`);
	return found.id;
}

async function charge(
	page: Page,
	accountId: string,
	input: { name: string; cents: number; date: string; categoryId?: string },
) {
	const res = await page.request.post(`${API}/transactions`, {
		data: {
			name: input.name,
			amount: -input.cents,
			date: input.date,
			bankAccountId: accountId,
			categoryId: input.categoryId,
		},
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function preview(page: Page, accountId: string, contents: string) {
	return page.request.post(`${API}/accounts/${accountId}/statement-import/preview`, {
		data: { file: contents },
	});
}

async function previewData(page: Page, accountId: string, contents: string) {
	const res = await preview(page, accountId, contents);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: Preview }).data;
}

async function commit(
	page: Page,
	accountId: string,
	contents: string,
	overrides: { statementBalance?: number; unmatchedFitIds?: string[] } = {},
) {
	const { statement } = await previewData(page, accountId, contents);
	return page.request.post(`${API}/accounts/${accountId}/statement-import`, {
		data: {
			file: contents,
			statement: {
				...statement,
				statementBalance: overrides.statementBalance ?? statement.statementBalance,
			},
			unmatchedFitIds: overrides.unmatchedFitIds ?? [],
		},
	});
}

async function rows(page: Page, accountId: string) {
	const res = await page.request.get(`${API}/transactions?accountId=${accountId}&limit=200`);
	return ((await res.json()) as { data: Row[] }).data;
}

async function openCard(page: Page, name: string) {
	await page.goto("/accounts");
	await page.getByRole("button", { name: new RegExp(name) }).click();
	return page.getByRole("dialog", { name });
}

async function openImport(page: Page, cardName: string, filePath: string) {
	const card = await openCard(page, cardName);
	await card
		.getByRole("region", { name: "Statement periods" })
		.getByRole("button", { name: "Import statement" })
		.click();
	const drawer = page.getByRole("dialog", { name: "Import statement" });
	await drawer.getByLabel("Statement file").setInputFiles(filePath);
	return { card, drawer };
}

test("a Synchrony QFX matches 2 hand-entered charges, adds 1, and confirms all 3", async ({
	page,
}) => {
	const card = await createCard(page, "Sams Club Mastercard");
	const groceries = await categoryId(page, "Groceries");
	await charge(page, card, {
		name: "Sam's Club run",
		cents: 4_000,
		date: "2026-10-03",
		categoryId: groceries,
	});
	await charge(page, card, { name: "Sam's online order", cents: 12_537, date: "2026-10-12" });

	const { card: cardDrawer, drawer } = await openImport(
		page,
		"Sams Club Mastercard",
		SYNCHRONY_QFX,
	);
	await expect(drawer.getByLabel("Period start")).toHaveValue("2026-10-01");
	await expect(drawer.getByLabel("Close date")).toHaveValue("2026-10-31");
	await expect(drawer.getByLabel("Statement balance")).toHaveValue("184.36");
	const matched = drawer.getByRole("list", { name: "Matched" }).getByRole("listitem");
	await expect(matched).toHaveCount(2);
	await expect(matched.first()).toContainText("Sam's Club run");
	await expect(matched.first()).toContainText("SAMS CLUB #6612");
	const added = drawer.getByRole("list", { name: "New" }).getByRole("listitem");
	await expect(added).toHaveCount(1);
	await expect(added).toContainText("SAMS CLUB FUEL #6612");

	await drawer.getByRole("button", { name: "Import", exact: true }).click();
	await expect(page.getByText("Imported 1 new, confirmed 2")).toBeVisible();
	await expect(drawer).toHaveCount(0);
	await expect(
		cardDrawer.getByRole("region", { name: "Statement periods" }).getByText(/imported/),
	).toBeVisible();
	await expect(cardDrawer.getByLabel("Balance")).toHaveValue("184.36");

	const after = await rows(page, card);
	expect(after).toHaveLength(3);
	expect(after.every((row) => row.isStatementConfirmed)).toBe(true);
	const run = after.find((row) => row.name === "Sam's Club run");
	expect(run).toMatchObject({ date: "2026-10-05", amount: -4_000 });
	expect(run?.category?.id).toBe(groceries);
});

test("an Apple Card OFX parses its period, balance, and lines, and re-importing adds nothing", async ({
	page,
}) => {
	const card = await createCard(page, "Apple Card");
	const parsed = await previewData(page, card, file(APPLE_OFX));
	expect(parsed.statement).toMatchObject({
		periodStart: "2026-09-01",
		periodEnd: "2026-09-30",
		statementBalance: 7_170,
	});
	expect(parsed.newLines.map((line) => [line.date, line.amount, line.name])).toEqual([
		["2026-09-04", -1_250, "Blue Bottle Coffee"],
		["2026-09-15", -6_420, "Trader Joe's"],
		["2026-09-22", 500, "Return Trader Joe's"],
	]);

	await openImport(page, "Apple Card", APPLE_OFX);
	await page
		.getByRole("dialog", { name: "Import statement" })
		.getByRole("button", { name: "Import", exact: true })
		.click();
	await expect(page.getByText("Imported 3 new, confirmed 0")).toBeVisible();
	expect(await rows(page, card)).toHaveLength(3);

	const again = await previewData(page, card, file(APPLE_OFX));
	expect(again.alreadyImported).toHaveLength(3);
	expect(again.newLines).toHaveLength(0);
	expect(again.matched).toHaveLength(0);
	const second = await commit(page, card, file(APPLE_OFX));
	expect(second.status()).toBe(201);
	expect(((await second.json()) as { data: { added: number } }).data.added).toBe(0);
	expect(await rows(page, card)).toHaveLength(3);
});

test("a hand-entered amount that differs by a dollar does not match", async ({ page }) => {
	const card = await createCard(page, "Sams Club Mastercard");
	await charge(page, card, { name: "Close but not quite", cents: 4_100, date: "2026-10-05" });
	const parsed = await previewData(page, card, file(SYNCHRONY_QFX));
	expect(parsed.matched).toHaveLength(0);
	expect(parsed.newLines.map((line) => line.amount)).toContain(-4_000);
	expect(parsed.notOnStatement.map((row) => row.name)).toEqual(["Close but not quite"]);
});

test("a charge 1 day before the close is not flagged as not on statement", async ({ page }) => {
	const card = await createCard(page, "Sams Club Mastercard");
	await charge(page, card, { name: "Late charge", cents: 999, date: "2026-10-30" });
	const parsed = await previewData(page, card, file(SYNCHRONY_QFX));
	expect(parsed.notOnStatement).toHaveLength(0);
	expect((await commit(page, card, file(SYNCHRONY_QFX))).status()).toBe(201);
	const late = (await rows(page, card)).find((row) => row.name === "Late charge");
	expect(late?.isNotOnStatement).toBe(false);
});

test("a hand-entered charge with no line gets the badge; Keep clears it and Delete removes it", async ({
	page,
}) => {
	const card = await createCard(page, "Sams Club Mastercard");
	await charge(page, card, { name: "Lunch with Sam", cents: 2_250, date: "2026-10-08" });
	await charge(page, card, { name: "Mystery charge", cents: 777, date: "2026-10-09" });
	expect((await commit(page, card, file(SYNCHRONY_QFX))).status()).toBe(201);

	const cardDrawer = await openCard(page, "Sams Club Mastercard");
	const periods = cardDrawer.getByRole("region", { name: "Statement periods" });
	const lunch = periods.getByRole("listitem").filter({ hasText: "Lunch with Sam" });
	const mystery = periods.getByRole("listitem").filter({ hasText: "Mystery charge" });
	await expect(lunch.getByText("Not on statement")).toBeVisible();
	await expect(mystery.getByText("Not on statement")).toBeVisible();

	await lunch.getByRole("button", { name: "Keep Lunch with Sam" }).click();
	await expect(lunch.getByText("Not on statement")).toHaveCount(0);

	await mystery.getByRole("button", { name: "Delete Mystery charge" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
	await expect(mystery).toHaveCount(0);

	const after = await rows(page, card);
	expect(after.find((row) => row.name === "Lunch with Sam")?.isNotOnStatement).toBe(false);
	expect(after.find((row) => row.name === "Mystery charge")).toBeUndefined();
});

test("unmatching a pair in the preview adds the line as new and flags the hand-entered row", async ({
	page,
}) => {
	const card = await createCard(page, "Sams Club Mastercard");
	await charge(page, card, { name: "Sam's Club run", cents: 4_000, date: "2026-10-03" });

	const { drawer } = await openImport(page, "Sams Club Mastercard", SYNCHRONY_QFX);
	const matched = drawer.getByRole("list", { name: "Matched" }).getByRole("listitem");
	await expect(matched).toHaveCount(1);
	await matched.getByRole("button", { name: "Unmatch" }).click();
	await expect(drawer.getByRole("list", { name: "Matched" })).toHaveCount(0);
	await expect(drawer.getByRole("list", { name: "New" }).getByRole("listitem")).toHaveCount(3);
	await expect(
		drawer.getByRole("list", { name: "Not on statement" }).getByRole("listitem"),
	).toContainText("Sam's Club run");

	await drawer.getByRole("button", { name: "Import", exact: true }).click();
	await expect(page.getByText("Imported 3 new, confirmed 0, 1 not on statement")).toBeVisible();
	const after = await rows(page, card);
	expect(after).toHaveLength(4);
	expect(after.find((row) => row.name === "Sam's Club run")?.isNotOnStatement).toBe(true);
});

test("a file that isn't OFX shows an inline error and writes nothing", async ({ page }) => {
	const card = await createCard(page, "Sams Club Mastercard");
	const { drawer } = await openImport(page, "Sams Club Mastercard", NOT_OFX);
	await expect(drawer.getByRole("alert")).toHaveText("This file isn't an OFX/QFX statement");
	await expect(drawer.getByRole("button", { name: "Import", exact: true })).toHaveCount(0);

	const res = await preview(page, card, file(NOT_OFX));
	expect(res.status()).toBe(400);
	expect(await rows(page, card)).toHaveLength(0);
});

test("a Plaid-linked card offers no import and the API answers 403", async ({ page }) => {
	await page.request.post(`${API}/plaid/create-link-token`);
	const exchanged = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	expect(exchanged.status()).toBe(200);
	const accounts = await page.request.get(`${API}/accounts`);
	const plaidCard = ((await accounts.json()) as { data: { id: string; name: string }[] }).data.find(
		(row) => row.name === "Plaid Credit Card",
	);
	if (!plaidCard) throw new Error("Plaid Credit Card missing");

	const cardDrawer = await openCard(page, "Plaid Credit Card");
	await expect(cardDrawer.getByRole("region", { name: "Statement periods" })).toBeVisible();
	await expect(cardDrawer.getByRole("button", { name: "Import statement" })).toHaveCount(0);

	expect((await preview(page, plaidCard.id, file(SYNCHRONY_QFX))).status()).toBe(403);
	const direct = await page.request.post(`${API}/accounts/${plaidCard.id}/statement-import`, {
		data: {
			file: file(SYNCHRONY_QFX),
			statement: {
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
				statementBalance: 18_436,
				minimumPayment: null,
				dueDate: null,
			},
			unmatchedFitIds: [],
		},
	});
	expect(direct.status()).toBe(403);
});

test("another User's account answers 404 to preview and commit and nothing is written", async ({
	page,
	browser,
}) => {
	const card = await createCard(page, "Sams Club Mastercard");
	const otherContext = await browser.newContext({ baseURL: "http://localhost:5173" });
	const other = await otherContext.newPage();
	await signUp(other);

	expect((await preview(other, card, file(SYNCHRONY_QFX))).status()).toBe(404);
	const committed = await other.request.post(`${API}/accounts/${card}/statement-import`, {
		data: {
			file: file(SYNCHRONY_QFX),
			statement: {
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
				statementBalance: 18_436,
				minimumPayment: null,
				dueDate: null,
			},
			unmatchedFitIds: [],
		},
	});
	expect(committed.status()).toBe(404);
	expect(await rows(page, card)).toHaveLength(0);
	await otherContext.close();
});
