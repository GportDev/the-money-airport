import { expect, type Page, test as unsigned } from "@playwright/test";
import { expect as signedExpect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { seedFxRate } from "./helpers/fx";
import { daysAgo } from "./helpers/snapshots";

const API = "http://localhost:3000/api";

type CardStatement = {
	id: string;
	periodStart: string;
	periodEnd: string;
	statementBalance: number;
	minimumPayment: number | null;
	dueDate: string | null;
	source: "plaid" | "manual";
};
type Account = {
	id: string;
	name: string;
	displayGroup: string;
	aprBps: number | null;
	inDebtPlan: boolean;
	card: {
		statementCloseDay: number | null;
		paymentDueDay: number | null;
		paymentRule: string;
		latestStatement: CardStatement | null;
		currentPeriodSpend: number;
		overriddenFields: string[];
	} | null;
	loan: { scheduledPayment: number | null; extraPayment: number; termMonths: number | null } | null;
};
type DebtPlan = {
	strategy: string;
	totalDebt: number;
	debtFreeMonth: string | null;
	liabilities: {
		account: { id: string; name: string };
		payback: number;
		payoffMonth: string | null;
	}[];
	notInPlan: { account: { id: string } }[];
	series: { month: string; balances: Record<string, number>; payback: number }[];
};

async function createAccount(page: Page, input: Record<string, unknown>) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	signedExpect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

function card(page: Page, name: string, balance: number) {
	return createAccount(page, {
		name,
		type: "credit",
		displayGroup: "credit",
		currentBalance: balance,
	});
}

function checking(page: Page, balance: number) {
	return createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: balance,
	});
}

async function patchAccount(page: Page, id: string, data: Record<string, unknown>) {
	const res = await page.request.patch(`${API}/accounts/${id}`, { data });
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: Account }).data;
}

async function account(page: Page, id: string) {
	const res = await page.request.get(`${API}/accounts`);
	const found = ((await res.json()) as { data: Account[] }).data.find((entry) => entry.id === id);
	if (!found) throw new Error("No account");
	return found;
}

async function debtPlan(page: Page, months = 3) {
	const res = await page.request.get(`${API}/forecast/debt?months=${months}`);
	signedExpect(res.status()).toBe(200);
	return ((await res.json()) as { data: DebtPlan }).data;
}

function nextMonthDay(day: number) {
	const now = new Date();
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
	return date.toISOString().slice(0, 10);
}

async function otherUserPage(page: Page) {
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	const other = await context.newPage();
	await signUp(other);
	return { other, close: () => context.close() };
}

unsigned("debt APIs reject an unauthenticated request", async ({ request }) => {
	expect((await request.get(`${API}/forecast/debt`)).status()).toBe(401);
	expect(
		(await request.put(`${API}/forecast/debt/order`, { data: { bankAccountIds: [] } })).status(),
	).toBe(401);
});

test("Plaid Liabilities fills Card terms and a Statement, and a User-set APR survives sync", async ({
	page,
}) => {
	const exchange = await page.request.post(`${API}/plaid/exchange-token`, {
		data: { publicToken: "public-sandbox-fake" },
	});
	signedExpect(exchange.status()).toBe(200);
	const accounts = (
		(await (await page.request.get(`${API}/accounts`)).json()) as { data: Account[] }
	).data;
	const plaidCard = accounts.find((entry) => entry.displayGroup === "credit");
	if (!plaidCard) throw new Error("No Plaid card");
	signedExpect(plaidCard.aprBps).toBe(1_250);
	signedExpect(plaidCard.card?.latestStatement).toMatchObject({
		statementBalance: 41_000,
		minimumPayment: 2_000,
		source: "plaid",
	});
	signedExpect(plaidCard.card?.paymentDueDay).toBe(Number(daysAgo(-15).slice(8, 10)));

	const patched = await patchAccount(page, plaidCard.id, { aprBps: 2_900 });
	signedExpect(patched.card?.overriddenFields).toContain("aprBps");
	signedExpect((await page.request.post(`${API}/plaid/sync-all`)).status()).toBe(200);
	signedExpect((await account(page, plaidCard.id)).aprBps).toBe(2_900);
});

test("a manual Statement sets the Statement period and the current period spend", async ({
	page,
}) => {
	const visa = await card(page, "Visa", 45_000);
	const created = await page.request.post(`${API}/accounts/${visa}/statements`, {
		data: {
			periodStart: daysAgo(40),
			periodEnd: daysAgo(10),
			statementBalance: 30_000,
			minimumPayment: 2_500,
			dueDate: daysAgo(-15),
		},
	});
	signedExpect(created.status()).toBe(201);
	for (const [days, amount] of [
		[20, -10_000],
		[5, -15_000],
	] as const) {
		const res = await page.request.post(`${API}/transactions`, {
			data: { name: "Charge", amount, date: daysAgo(days), bankAccountId: visa },
		});
		signedExpect(res.status()).toBe(201);
	}

	const summary = (await account(page, visa)).card;
	signedExpect(summary?.latestStatement?.statementBalance).toBe(30_000);
	signedExpect(summary?.currentPeriodSpend).toBe(15_000);
	signedExpect(summary?.statementCloseDay).toBe(Number(daysAgo(10).slice(8, 10)));

	const latest = await page.request.get(`${API}/accounts/${visa}/statements`);
	const period = (
		(await latest.json()) as {
			data: { total: number; periodEnd: string; statement: CardStatement | null };
		}
	).data;
	signedExpect(period.statement?.statementBalance).toBe(30_000);
	signedExpect(period.total).toBe(-10_000);

	const open = await page.request.get(`${API}/accounts/${visa}/statements?periodEnd=open`);
	const current = ((await open.json()) as { data: { total: number; statement: unknown } }).data;
	signedExpect(current.statement).toBeNull();
	signedExpect(current.total).toBe(-15_000);
});

test("Loan terms compute the scheduled payment and payoff scenarios", async ({ page }) => {
	const loan = await createAccount(page, {
		name: "Truck loan",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 3_260_550,
	});
	await patchAccount(page, loan, { aprBps: 700 });
	const terms = await page.request.put(`${API}/accounts/${loan}/loan-terms`, {
		data: {
			principal: 3_260_550,
			termMonths: 75,
			firstPaymentDate: nextMonthDay(1),
			paymentDay: 1,
		},
	});
	signedExpect(terms.status()).toBe(200);
	signedExpect((await account(page, loan)).loan?.scheduledPayment).toBe(53_800);

	const res = await page.request.get(`${API}/accounts/${loan}/amortization`);
	signedExpect(res.status()).toBe(200);
	const data = (
		(await res.json()) as {
			data: {
				basePayment: number;
				scenarios: { extra: number; monthsSaved: number; interestSaved: number }[];
				schedule: { endingBalance: number }[];
			};
		}
	).data;
	signedExpect(data.basePayment).toBe(53_800);
	signedExpect(data.schedule).toHaveLength(75);
	const hundred = data.scenarios.find((scenario) => scenario.extra === 10_000);
	signedExpect(hundred?.monthsSaved).toBe(14);
	signedExpect(hundred?.interestSaved).toBeGreaterThan(0);
});

test("Loan terms and Statements refuse the wrong kind of account", async ({ page }) => {
	const cash = await checking(page, 1_000);
	const loan = await createAccount(page, {
		name: "Loan",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 1_000,
	});
	signedExpect(
		(
			await page.request.put(`${API}/accounts/${cash}/loan-terms`, { data: { termMonths: 12 } })
		).status(),
	).toBe(400);
	signedExpect(
		(
			await page.request.post(`${API}/accounts/${loan}/statements`, {
				data: { periodStart: daysAgo(40), periodEnd: daysAgo(10), statementBalance: 1 },
			})
		).status(),
	).toBe(400);
	signedExpect((await page.request.get(`${API}/accounts/${loan}/amortization`)).status()).toBe(400);
});

test("the Debt plan orders liabilities by strategy, and a custom order switches to Custom", async ({
	page,
}) => {
	const amex = await card(page, "Amex", 100_000);
	const blue = await card(page, "Blue", 50_000);
	await patchAccount(page, amex, { aprBps: 2_900 });
	await patchAccount(page, blue, { aprBps: 1_500 });
	const names = (plan: DebtPlan) => plan.liabilities.map((entry) => entry.account.name);

	const avalanche = await debtPlan(page);
	signedExpect(avalanche.strategy).toBe("avalanche");
	signedExpect(names(avalanche)).toEqual(["Amex", "Blue"]);
	signedExpect(avalanche.totalDebt).toBe(150_000);

	await page.request.patch(`${API}/settings`, { data: { debtStrategy: "snowball" } });
	signedExpect(names(await debtPlan(page))).toEqual(["Blue", "Amex"]);

	const ordered = await page.request.put(`${API}/forecast/debt/order`, {
		data: { bankAccountIds: [amex, blue] },
	});
	signedExpect(ordered.status()).toBe(200);
	const custom = ((await ordered.json()) as { data: DebtPlan }).data;
	signedExpect(custom.strategy).toBe("custom");
	signedExpect(names(custom)).toEqual(["Amex", "Blue"]);

	await patchAccount(page, blue, { inDebtPlan: false });
	const without = await debtPlan(page);
	signedExpect(names(without)).toEqual(["Amex"]);
	signedExpect(without.notInPlan.map((entry) => entry.account.id)).toEqual([blue]);
});

test("Payback spills past the last card to a balance-only BRL loan without crossing the buffer", async ({
	page,
}) => {
	seedFxRate("BRL", "USD", "0.2");
	await checking(page, 100_000);
	const visa = await card(page, "Visa", 20_000);
	await patchAccount(page, visa, { aprBps: 2_900 });
	const andre = await createAccount(page, {
		name: "André",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 500_000,
		isoCurrencyCode: "BRL",
	});

	const plan = await debtPlan(page);
	signedExpect(plan.liabilities.map((entry) => entry.account.id)).toEqual([visa, andre]);
	signedExpect(plan.series.reduce((sum, month) => sum + month.payback, 0)).toBe(85_000);
	const last = plan.series.at(-1);
	signedExpect(last?.balances[visa]).toBe(0);
	signedExpect(last?.balances[andre]).toBe(35_000);

	const now = new Date();
	const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	const month = await page.request.get(
		`${API}/forecast/month?year=${next.getUTCFullYear()}&month=${next.getUTCMonth() + 1}`,
	);
	const data = (
		(await month.json()) as { data: { series: { value: number }[]; shortfalls: unknown[] } }
	).data;
	signedExpect(data.shortfalls).toEqual([]);
	signedExpect(data.series.every((point) => point.value >= 15_000)).toBe(true);
});

test("a pay-down Goal shows its liability's payoff month from the Debt plan", async ({ page }) => {
	await checking(page, 200_000);
	const visa = await card(page, "Visa", 50_000);
	const goal = await page.request.post(`${API}/goals`, {
		data: { name: "Kill the Visa", type: "pay_down", targetAmount: 50_000 },
	});
	const goalId = ((await goal.json()) as { data: { id: string } }).data.id;
	await page.request.put(`${API}/goals/${goalId}/accounts`, { data: { bankAccountIds: [visa] } });

	const plan = await debtPlan(page);
	const payoff = plan.liabilities.find((entry) => entry.account.id === visa)?.payoffMonth;
	signedExpect(payoff).toMatch(/^\d{4}-\d{2}$/);
	const goals = await page.request.get(`${API}/goals?type=pay_down`);
	const listed = (
		(await goals.json()) as { data: { goals: { id: string; payoffMonth: string | null }[] } }
	).data.goals.find((entry) => entry.id === goalId);
	signedExpect(listed?.payoffMonth).toBe(payoff);
});

test("another User cannot read or change these liabilities", async ({ page }) => {
	const visa = await card(page, "Visa", 10_000);
	const loan = await createAccount(page, {
		name: "Loan",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 10_000,
	});
	const { other, close } = await otherUserPage(page);
	try {
		signedExpect((await other.request.get(`${API}/accounts/${visa}/statements`)).status()).toBe(
			404,
		);
		signedExpect(
			(
				await other.request.post(`${API}/accounts/${visa}/statements`, {
					data: { periodStart: daysAgo(40), periodEnd: daysAgo(10), statementBalance: 1 },
				})
			).status(),
		).toBe(404);
		signedExpect(
			(
				await other.request.put(`${API}/accounts/${loan}/loan-terms`, { data: { termMonths: 12 } })
			).status(),
		).toBe(404);
		signedExpect((await other.request.get(`${API}/accounts/${loan}/amortization`)).status()).toBe(
			404,
		);
		signedExpect(
			(
				await other.request.put(`${API}/forecast/debt/order`, {
					data: { bankAccountIds: [visa, loan] },
				})
			).status(),
		).toBe(404);
	} finally {
		await close();
	}
});

test("Debt tab: hero, strategy switch, and reordering liability cards", async ({ page }) => {
	const amex = await card(page, "Amex", 100_000);
	const blue = await card(page, "Blue", 50_000);
	await patchAccount(page, amex, { aprBps: 2_900 });
	await patchAccount(page, blue, { aprBps: 1_500 });

	await page.goto("/forecast?tab=debt");
	await signedExpect(page.getByLabel("Debt summary").getByText("$1,500.00")).toBeVisible();
	const list = page.getByRole("list", { name: "Debt plan" });
	await signedExpect(list.getByRole("listitem").first()).toContainText("Amex");

	await page.getByLabel("Strategy").click();
	await page.getByRole("option", { name: "Snowball" }).click();
	await signedExpect(page.getByText("Strategy saved")).toBeVisible();
	await signedExpect(list.getByRole("listitem").first()).toContainText("Blue");

	await list.getByRole("button", { name: "Move Amex up" }).click();
	await signedExpect(list.getByRole("listitem").first()).toContainText("Amex");
	await signedExpect(page.getByLabel("Strategy")).toContainText("Custom");
});

test("Loan payoff drawer: using a scenario sets the extra payment", async ({ page }) => {
	const loan = await createAccount(page, {
		name: "Truck loan",
		type: "loan",
		displayGroup: "loan",
		currentBalance: 3_260_550,
	});
	await patchAccount(page, loan, { aprBps: 700 });
	await page.request.put(`${API}/accounts/${loan}/loan-terms`, {
		data: {
			principal: 3_260_550,
			termMonths: 75,
			firstPaymentDate: nextMonthDay(1),
			paymentDay: 1,
		},
	});

	await page.goto("/forecast?tab=debt");
	await page.getByRole("button", { name: /Truck loan/ }).click();
	const drawer = page.getByRole("dialog", { name: "Truck loan payoff" });
	await signedExpect(drawer.getByText("$538.00", { exact: false }).first()).toBeVisible();
	await drawer.getByRole("button", { name: "Use +$100.00" }).click();
	await signedExpect(page.getByText("Extra payment set")).toBeVisible();
	signedExpect((await account(page, loan)).loan?.extraPayment).toBe(10_000);
});

test("Account drawer: credit section shows the Statement and saves Card terms", async ({
	page,
}) => {
	const visa = await card(page, "Visa", 45_000);
	await page.request.post(`${API}/accounts/${visa}/statements`, {
		data: {
			periodStart: daysAgo(40),
			periodEnd: daysAgo(10),
			statementBalance: 30_000,
			minimumPayment: 2_500,
			dueDate: daysAgo(-15),
		},
	});

	await page.goto("/accounts");
	await page.getByRole("button", { name: /Visa/ }).first().click();
	const drawer = page.getByRole("dialog", { name: "Visa" });
	const statement = drawer.getByRole("region", { name: "Last statement" });
	await signedExpect(statement.getByText("$300.00")).toBeVisible();
	await signedExpect(statement.getByText("min $25.00")).toBeVisible();

	await drawer.getByLabel("APR (%)").fill("29");
	await drawer.getByRole("button", { name: "Save card terms" }).click();
	await signedExpect(page.getByText("Card terms saved")).toBeVisible();
	signedExpect((await account(page, visa)).aprBps).toBe(2_900);
});
