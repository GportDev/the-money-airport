import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";

const API = "http://localhost:3000/api";

type GoalAccount = { id: string; name: string; currentBalance: number };
type Goal = {
	id: string;
	name: string;
	type: "save_up" | "pay_down";
	funding: "accounts" | "fund";
	icon: string;
	color: string;
	targetAmount: number;
	currentAmount: number;
	targetDate: string | null;
	status: "on_track" | "at_risk";
	percentComplete: number;
	accounts: GoalAccount[];
	host: { id: string; name: string; unassigned: number } | null;
	payoffMonth: string | null;
};
type GoalsList = {
	totalCurrent: number;
	baseCurrency: string;
	goals: Goal[];
	hosts: {
		id: string;
		name: string;
		balance: number;
		unassigned: number;
		funds: { goalId: string; name: string; balance: number }[];
	}[];
};
type FundEntry = {
	id: string;
	date: string;
	amount: number;
	kind: "deposit" | "withdrawal" | "interest";
	transactionId: string | null;
	note: string | null;
	balanceAfter: number;
};
type Account = {
	id: string;
	name: string;
	apyBps: number | null;
	funds: { goalId: string; name: string; balance: number }[];
	unassigned: number | null;
};

function monthStart(offset: number) {
	const now = new Date();
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
	return date.toISOString().slice(0, 10);
}

function dayInMonth(offset: number, day: number) {
	return `${monthStart(offset).slice(0, 8)}${String(day).padStart(2, "0")}`;
}

async function createAccount(
	page: Page,
	input: { name: string; type: string; displayGroup: string; currentBalance: number },
) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

async function createGoal(page: Page, data: Record<string, unknown>) {
	const res = await page.request.post(`${API}/goals`, { data });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: Goal }).data;
}

async function setAccounts(page: Page, goalId: string, bankAccountIds: string[]) {
	return page.request.put(`${API}/goals/${goalId}/accounts`, { data: { bankAccountIds } });
}

async function listGoals(page: Page, type?: Goal["type"]) {
	const res = await page.request.get(`${API}/goals${type ? `?type=${type}` : ""}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: GoalsList }).data;
}

async function goal(page: Page, id: string) {
	const found = (await listGoals(page)).goals.find((row) => row.id === id);
	if (!found) throw new Error(`No goal ${id}`);
	return found;
}

async function addEntry(page: Page, goalId: string, data: Record<string, unknown>) {
	return page.request.post(`${API}/goals/${goalId}/entries`, { data });
}

async function entries(page: Page, goalId: string) {
	const res = await page.request.get(`${API}/goals/${goalId}/entries`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: FundEntry[]; nextCursor: string | null }).data;
}

async function accountById(page: Page, id: string) {
	const res = await page.request.get(`${API}/accounts`);
	const found = ((await res.json()) as { data: Account[] }).data.find((row) => row.id === id);
	if (!found) throw new Error(`No account ${id}`);
	return found;
}

unsigned("goals APIs reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/goals`)).status()).toBe(401);
	expect((await request.post(`${API}/goals`, { data: {} })).status()).toBe(401);
});

test("a save-up Goal's progress is the sum of its visible associated assets", async ({ page }) => {
	const ally = await createAccount(page, {
		name: "Ally",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 200000,
	});
	const hysa = await createAccount(page, {
		name: "HYSA",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 80000,
	});
	const card = await createAccount(page, {
		name: "Visa",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 5000,
	});
	const created = await createGoal(page, {
		name: "Emergency",
		type: "save_up",
		targetAmount: 1000000,
	});
	signedExpect(created).toMatchObject({
		funding: "accounts",
		currentAmount: 0,
		percentComplete: 0,
		accounts: [],
		payoffMonth: null,
	});

	signedExpect((await setAccounts(page, created.id, [ally, hysa])).status()).toBe(200);
	const withAccounts = await goal(page, created.id);
	signedExpect(withAccounts.currentAmount).toBe(280000);
	signedExpect(withAccounts.percentComplete).toBeCloseTo(0.28);
	signedExpect(withAccounts.accounts.map((row) => row.name).sort()).toEqual(["Ally", "HYSA"]);
	signedExpect((await listGoals(page, "save_up")).totalCurrent).toBe(280000);

	signedExpect((await setAccounts(page, created.id, [card])).status()).toBe(400);

	await page.request.patch(`${API}/accounts/${hysa}`, { data: { isHidden: true } });
	signedExpect((await goal(page, created.id)).currentAmount).toBe(200000);
	signedExpect((await setAccounts(page, created.id, [ally, hysa])).status()).toBe(400);
});

test("associating a BankAccount moves it off its previous Goal", async ({ page }) => {
	const ally = await createAccount(page, {
		name: "Ally",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 50000,
	});
	const first = await createGoal(page, { name: "Vacation", type: "save_up", targetAmount: 100000 });
	const second = await createGoal(page, { name: "Car", type: "save_up", targetAmount: 100000 });
	await setAccounts(page, first.id, [ally]);
	signedExpect((await setAccounts(page, second.id, [ally])).status()).toBe(200);
	signedExpect((await goal(page, first.id)).accounts).toEqual([]);
	signedExpect((await goal(page, second.id)).currentAmount).toBe(50000);
});

test("a pay-down Goal takes at most one liability and shows what is still owed", async ({
	page,
}) => {
	const card = await createAccount(page, {
		name: "Visa",
		type: "credit",
		displayGroup: "credit",
		currentBalance: 40000,
	});
	const loan = await createAccount(page, {
		name: "Car loan",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 900000,
	});
	const savings = await createAccount(page, {
		name: "Ally",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 1000,
	});
	const payDown = await createGoal(page, {
		name: "Visa off",
		type: "pay_down",
		targetAmount: 100000,
	});
	signedExpect(payDown.percentComplete).toBe(0);

	signedExpect((await setAccounts(page, payDown.id, [card, loan])).status()).toBe(400);
	signedExpect((await setAccounts(page, payDown.id, [savings])).status()).toBe(400);
	signedExpect((await setAccounts(page, payDown.id, [card])).status()).toBe(200);
	const progress = await goal(page, payDown.id);
	signedExpect(progress.currentAmount).toBe(40000);
	signedExpect(progress.percentComplete).toBeCloseTo(0.6);

	const saveUps = await listGoals(page, "save_up");
	signedExpect(saveUps.goals).toEqual([]);
	signedExpect((await listGoals(page, "pay_down")).goals.map((row) => row.name)).toEqual([
		"Visa off",
	]);
});

test("validates Goal create, update, and delete", async ({ page }) => {
	const host = await createAccount(page, {
		name: "Savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const bad = [
		{ name: "", type: "save_up", targetAmount: 100 },
		{ name: "X", type: "save_up", targetAmount: 0 },
		{ name: "X", type: "nope", targetAmount: 100 },
		{ name: "X", type: "save_up", targetAmount: 100, targetDate: "2026-13-01" },
		{ name: "X", type: "save_up", targetAmount: 100, funding: "fund" },
		{ name: "X", type: "pay_down", targetAmount: 100, funding: "fund", hostBankAccountId: host },
	];
	for (const data of bad) {
		const res = await page.request.post(`${API}/goals`, { data });
		signedExpect(res.status(), JSON.stringify(data)).toBe(400);
	}

	const created = await createGoal(page, {
		name: "Trip",
		type: "save_up",
		targetAmount: 100000,
		icon: "plane",
		color: "#3B82F6",
	});
	signedExpect(created).toMatchObject({ icon: "plane", color: "#3B82F6" });
	const patched = await page.request.patch(`${API}/goals/${created.id}`, {
		data: { name: "Japan trip", targetAmount: 250000, targetDate: "2027-04-01" },
	});
	signedExpect(patched.status()).toBe(200);
	signedExpect(((await patched.json()) as { data: Goal }).data).toMatchObject({
		name: "Japan trip",
		targetAmount: 250000,
		targetDate: "2027-04-01",
	});
	const unknown = "00000000-0000-4000-8000-000000000000";
	signedExpect((await page.request.patch(`${API}/goals/${unknown}`, { data: {} })).status()).toBe(
		404,
	);
	signedExpect((await page.request.delete(`${API}/goals/${created.id}`)).status()).toBe(200);
	signedExpect((await listGoals(page)).goals).toEqual([]);
});

test("Funds share one host: entries, running balance, and Unassigned", async ({ page }) => {
	const host = await createAccount(page, {
		name: "Savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 100000,
	});
	const emergency = await createGoal(page, {
		name: "Emergency",
		type: "save_up",
		targetAmount: 500000,
		funding: "fund",
		hostBankAccountId: host,
	});
	const vacation = await createGoal(page, {
		name: "Vacation",
		type: "save_up",
		targetAmount: 200000,
		funding: "fund",
		hostBankAccountId: host,
	});
	signedExpect(emergency.host).toMatchObject({ id: host, name: "Savings", unassigned: 100000 });

	const accountsGoal = await createGoal(page, { name: "Other", type: "save_up", targetAmount: 1 });
	signedExpect((await setAccounts(page, accountsGoal.id, [host])).status()).toBe(400);
	signedExpect((await setAccounts(page, emergency.id, [host])).status()).toBe(400);

	signedExpect(
		(
			await addEntry(page, emergency.id, { date: "2026-01-05", amount: 60000, kind: "deposit" })
		).status(),
	).toBe(201);
	await addEntry(page, emergency.id, {
		date: "2026-02-05",
		amount: -10000,
		kind: "withdrawal",
		note: "Car repair",
	});
	await addEntry(page, vacation.id, { date: "2026-01-10", amount: 30000, kind: "deposit" });
	signedExpect(
		(
			await addEntry(page, vacation.id, { date: "2026-01-10", amount: -5, kind: "deposit" })
		).status(),
	).toBe(400);
	signedExpect(
		(
			await addEntry(page, vacation.id, { date: "2026-01-10", amount: 5, kind: "withdrawal" })
		).status(),
	).toBe(400);
	signedExpect(
		(
			await addEntry(page, accountsGoal.id, { date: "2026-01-10", amount: 5, kind: "deposit" })
		).status(),
	).toBe(400);

	const list = await entries(page, emergency.id);
	signedExpect(list.map((row) => [row.date, row.amount, row.balanceAfter, row.note])).toEqual([
		["2026-02-05", -10000, 50000, "Car repair"],
		["2026-01-05", 60000, 60000, null],
	]);
	signedExpect((await goal(page, emergency.id)).currentAmount).toBe(50000);
	signedExpect((await goal(page, emergency.id)).host?.unassigned).toBe(20000);

	const listed = await listGoals(page);
	signedExpect(listed.hosts).toEqual([
		{
			id: host,
			name: "Savings",
			isoCurrencyCode: "USD",
			balance: 100000,
			unassigned: 20000,
			funds: [
				{ goalId: emergency.id, name: "Emergency", balance: 50000 },
				{ goalId: vacation.id, name: "Vacation", balance: 30000 },
			],
		},
	]);
	const hostAccount = await accountById(page, host);
	signedExpect(hostAccount.unassigned).toBe(20000);
	signedExpect(hostAccount.funds.map((row) => row.name)).toEqual(["Emergency", "Vacation"]);

	await addEntry(page, vacation.id, { date: "2026-03-01", amount: 40000, kind: "deposit" });
	signedExpect((await accountById(page, host)).unassigned).toBe(-20000);

	const last = list[0];
	if (!last) throw new Error("No entry");
	signedExpect(
		(await page.request.delete(`${API}/goals/${emergency.id}/entries/${last.id}`)).status(),
	).toBe(200);
	signedExpect((await goal(page, emergency.id)).currentAmount).toBe(60000);
});

test("Assign to Fund turns a host Transaction into one Fund entry", async ({ page }) => {
	const host = await createAccount(page, {
		name: "Savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const fund = await createGoal(page, {
		name: "Vacation",
		type: "save_up",
		targetAmount: 100000,
		funding: "fund",
		hostBankAccountId: host,
	});
	const deposit = await page.request.post(`${API}/transactions`, {
		data: {
			name: "Transfer from checking",
			amount: 25000,
			date: "2026-03-02",
			bankAccountId: host,
		},
	});
	const depositId = ((await deposit.json()) as { data: { id: string } }).data.id;
	const elsewhere = await page.request.post(`${API}/transactions`, {
		data: { name: "Coffee", amount: -500, date: "2026-03-02", bankAccountId: checking },
	});
	const elsewhereId = ((await elsewhere.json()) as { data: { id: string } }).data.id;

	const assigned = await addEntry(page, fund.id, { transactionId: depositId });
	signedExpect(assigned.status()).toBe(201);
	signedExpect(((await assigned.json()) as { data: FundEntry }).data).toMatchObject({
		date: "2026-03-02",
		amount: 25000,
		kind: "deposit",
		transactionId: depositId,
	});
	signedExpect((await addEntry(page, fund.id, { transactionId: depositId })).status()).toBe(400);
	signedExpect((await addEntry(page, fund.id, { transactionId: elsewhereId })).status()).toBe(400);

	const detail = await page.request.get(`${API}/transactions/${depositId}`);
	signedExpect(
		((await detail.json()) as { data: { fundEntry: unknown } }).data.fundEntry,
	).toMatchObject({ goalId: fund.id, goalName: "Vacation" });
});

test("interest on a host splits across its Funds pro rata after a sync", async ({ page }) => {
	const exchange = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake-savings" },
	});
	signedExpect(exchange.status()).toBe(200);
	const accounts = (await (await page.request.get(`${API}/accounts`)).json()) as {
		data: { id: string; name: string }[];
	};
	const host = accounts.data.find((row) => row.name === "Plaid Saving");
	if (!host) throw new Error("No Plaid Saving account");

	const big = await createGoal(page, {
		name: "Emergency",
		type: "save_up",
		targetAmount: 500000,
		funding: "fund",
		hostBankAccountId: host.id,
	});
	const small = await createGoal(page, {
		name: "Vacation",
		type: "save_up",
		targetAmount: 200000,
		funding: "fund",
		hostBankAccountId: host.id,
	});
	const empty = await createGoal(page, {
		name: "New fund",
		type: "save_up",
		targetAmount: 100000,
		funding: "fund",
		hostBankAccountId: host.id,
	});
	await addEntry(page, big.id, { date: dayInMonth(-1, 1), amount: 300000, kind: "deposit" });
	await addEntry(page, small.id, { date: dayInMonth(-1, 1), amount: 100000, kind: "deposit" });

	signedExpect((await page.request.post(`${API}/plaid/sync-all`)).status()).toBe(200);
	await page.request.post(`${API}/plaid/sync-all`);

	const interestOf = async (goalId: string) =>
		(await entries(page, goalId)).filter((row) => row.kind === "interest").map((row) => row.amount);
	const bigInterest = await interestOf(big.id);
	const smallInterest = await interestOf(small.id);
	signedExpect(bigInterest).toEqual([2251]);
	signedExpect(smallInterest).toEqual([750]);
	signedExpect(await interestOf(empty.id)).toEqual([]);
});

test("status is At risk when the monthly need beats recent cash flow", async ({ page }) => {
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const nextYear = `${new Date().getUTCFullYear() + 1}-${monthStart(0).slice(5, 7)}-01`;
	const goalWithDate = await createGoal(page, {
		name: "House",
		type: "save_up",
		targetAmount: 1200000,
		targetDate: nextYear,
	});
	const noDate = await createGoal(page, { name: "Someday", type: "save_up", targetAmount: 1000 });
	signedExpect(goalWithDate.status).toBe("at_risk");
	signedExpect(noDate.status).toBe("on_track");

	for (const offset of [-1, -2, -3]) {
		await page.request.post(`${API}/transactions`, {
			data: {
				name: "Payroll",
				amount: 300000,
				date: dayInMonth(offset, 10),
				bankAccountId: checking,
			},
		});
	}
	signedExpect((await goal(page, goalWithDate.id)).status).toBe("on_track");
});

test("APY saves on a savings BankAccount", async ({ page }) => {
	const id = await createAccount(page, {
		name: "HYSA",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const res = await page.request.patch(`${API}/accounts/${id}`, { data: { apyBps: 425 } });
	signedExpect(res.status()).toBe(200);
	signedExpect((await accountById(page, id)).apyBps).toBe(425);
	signedExpect(
		(await page.request.patch(`${API}/accounts/${id}`, { data: { apyBps: -1 } })).status(),
	).toBe(400);
});

test("another User cannot see or change my Goals", async ({ page, browser }) => {
	const mine = await createAccount(page, {
		name: "Ally",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 1000,
	});
	const myGoal = await createGoal(page, {
		name: "Mine",
		type: "save_up",
		targetAmount: 1000,
		funding: "fund",
		hostBankAccountId: mine,
	});

	const context = await browser.newContext();
	const other = await context.newPage();
	await signUp(other);
	signedExpect((await listGoals(other)).goals).toEqual([]);
	signedExpect(
		(await other.request.patch(`${API}/goals/${myGoal.id}`, { data: { name: "Hacked" } })).status(),
	).toBe(404);
	signedExpect((await other.request.delete(`${API}/goals/${myGoal.id}`)).status()).toBe(404);
	signedExpect((await other.request.get(`${API}/goals/${myGoal.id}/entries`)).status()).toBe(404);
	signedExpect(
		(await addEntry(other, myGoal.id, { date: "2026-01-01", amount: 1, kind: "deposit" })).status(),
	).toBe(404);
	const theirs = await createGoal(other, { name: "Theirs", type: "save_up", targetAmount: 1000 });
	signedExpect((await setAccounts(other, theirs.id, [mine])).status()).toBe(404);
	signedExpect(
		(
			await other.request.post(`${API}/goals`, {
				data: {
					name: "Fund",
					type: "save_up",
					targetAmount: 1000,
					funding: "fund",
					hostBankAccountId: mine,
				},
			})
		).status(),
	).toBe(404);
	await context.close();
	signedExpect((await goal(page, myGoal.id)).name).toBe("Mine");
});

test("Goals page: add, edit accounts, panel, Fund entry, and pay down tab", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await createAccount(page, {
		name: "Ally",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 200000,
	});
	const host = await createAccount(page, {
		name: "Savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 100000,
	});
	const fund = await createGoal(page, {
		name: "Vacation",
		type: "save_up",
		targetAmount: 200000,
		funding: "fund",
		hostBankAccountId: host,
	});
	await page.goto("/goals");
	await signedExpect(page.getByRole("heading", { name: "Goals", level: 1 })).toBeVisible();
	const main = page.getByRole("main");
	const panel = page.getByRole("complementary", { name: "Summary" });

	await main.getByRole("button", { name: "Add goal" }).click();
	const drawer = page.getByRole("dialog", { name: "New goal" });
	await drawer.getByLabel("Name").fill("Emergency fund");
	await drawer.getByLabel("Target", { exact: true }).fill("10000");
	await drawer.getByRole("button", { name: "Create goal" }).click();
	await signedExpect(page.getByText("Goal created")).toBeVisible();
	await signedExpect(drawer).toHaveCount(0);
	const card = main.getByRole("button", { name: /Emergency fund/ });
	await signedExpect(card).toContainText("0% of $10,000.00");

	await main.getByRole("button", { name: "Edit accounts" }).click();
	const editor = page.getByRole("dialog", { name: "Edit accounts" });
	await editor.getByRole("combobox", { name: "Goal" }).click();
	await page.getByRole("option", { name: "Emergency fund" }).click();
	await signedExpect(editor.getByRole("checkbox", { name: /Savings/ })).toHaveCount(0);
	await editor.getByRole("checkbox", { name: /Ally/ }).click();
	await editor.getByRole("button", { name: "Save accounts" }).click();
	await signedExpect(page.getByText("Accounts saved")).toBeVisible();
	await signedExpect(card).toContainText("$2,000.00");
	await signedExpect(card).toContainText("20% of $10,000.00");
	await signedExpect(panel.getByRole("region", { name: "Goal accounts" })).toContainText("Ally");
	await signedExpect(panel.getByRole("region", { name: "Savings" })).toContainText(
		"Unassigned$1,000.00",
	);

	const fundCard = main.getByRole("button", { name: /Vacation/ });
	await signedExpect(fundCard).toContainText("in Savings");
	await fundCard.click();
	const fundDrawer = page.getByRole("dialog", { name: "Vacation" });
	await fundDrawer.getByRole("button", { name: "Add entry" }).click();
	await fundDrawer.getByLabel("Amount").fill("250");
	await fundDrawer.getByLabel("Date").fill("2026-03-04");
	await fundDrawer.getByLabel("Note").fill("Birthday money");
	await fundDrawer.getByRole("button", { name: "Save entry" }).click();
	await signedExpect(page.getByText("Entry added")).toBeVisible();
	await signedExpect(fundDrawer.getByText("Birthday money")).toBeVisible();
	await signedExpect(fundDrawer.getByRole("status", { name: "Fund balance" })).toContainText(
		"$250.00",
	);
	await page.keyboard.press("Escape");
	await signedExpect(fundDrawer).toHaveCount(0);
	await signedExpect(panel.getByRole("region", { name: "Savings" })).toContainText(
		"Unassigned$750.00",
	);
	signedExpect((await goal(page, fund.id)).currentAmount).toBe(25000);

	await main.getByRole("tab", { name: "Pay down" }).click();
	await signedExpect(page).toHaveURL(/tab=pay_down/);
	await signedExpect(main.getByRole("button", { name: /Emergency fund/ })).toHaveCount(0);
	await signedExpect(main.getByText("No pay-down goals yet")).toBeVisible();
});

test("Transaction drawer assigns a host deposit to a Fund", async ({ page }) => {
	const host = await createAccount(page, {
		name: "Savings",
		type: "savings",
		displayGroup: "cash",
		currentBalance: 0,
	});
	const fund = await createGoal(page, {
		name: "Vacation",
		type: "save_up",
		targetAmount: 100000,
		funding: "fund",
		hostBankAccountId: host,
	});
	await page.request.post(`${API}/transactions`, {
		data: { name: "Move to savings", amount: 12000, date: "2026-03-02", bankAccountId: host },
	});
	await page.goto("/transactions");
	await page.getByRole("button", { name: /Move to savings/ }).click({ position: { x: 60, y: 12 } });
	const drawer = page.getByRole("dialog");
	await drawer.getByRole("combobox", { name: "Assign to Fund" }).click();
	await page.getByRole("option", { name: "Vacation" }).click();
	await drawer.getByRole("button", { name: "Assign" }).click();
	await signedExpect(page.getByText("Assigned to Vacation")).toBeVisible();
	await signedExpect(drawer.getByText("In Vacation")).toBeVisible();
	signedExpect((await goal(page, fund.id)).currentAmount).toBe(12000);
});
