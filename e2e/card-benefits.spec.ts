import { randomUUID } from "node:crypto";
import { type Page, test as unsigned, expect as unsignedExpect } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signUp } from "./helpers/auth";
import { seedFxRate } from "./helpers/fx";
import { setPfcDetailed } from "./helpers/pfc";
import { daysAgo } from "./helpers/snapshots";

const API = "http://localhost:3000/api";

type RuleEarnings = {
	label: string;
	ratePer100: number;
	spend: number;
	units: number;
	value: number;
};
type RewardsPeriod = {
	from: string;
	to: string;
	spend: number;
	units: number;
	value: number;
	byRule: RuleEarnings[];
};
type CreditCard = {
	id: string;
	name: string;
	availableCredit: number | null;
	utilization: number | null;
	billingPeriod: {
		periodStart: string;
		closesOn: string | null;
		dueOn: string | null;
		spend: number;
		latestStatement: { statementBalance: number } | null;
	};
	benefits: { presetKey: string | null; productName: string; unitValue: number } | null;
	rewards: {
		month: RewardsPeriod;
		year: RewardsPeriod;
		credits: {
			label: string;
			periodStart: string;
			periodEnd: string;
			used: number;
			remaining: number;
		}[];
	} | null;
};
type BetterCard = { accountId: string; name: string; mask: string | null; extraValue: number };
type Purchase = { id: string; betterCard: BetterCard | null };

const today = () => daysAgo(0);

function monthEnd(date: string) {
	const last = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0));
	return last.toISOString().slice(0, 10);
}

async function createAccount(page: Page, input: Record<string, unknown>) {
	const res = await page.request.post(`${API}/accounts`, { data: input });
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: { id: string } }).data.id;
}

function card(page: Page, name: string, extra: Record<string, unknown> = {}) {
	return createAccount(page, {
		name,
		type: "credit",
		displayGroup: "credit",
		currentBalance: 0,
		...extra,
	});
}

function customBenefits(overrides: Record<string, unknown> = {}) {
	return {
		productName: "Custom card",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 100,
		earnRules: [],
		credits: [],
		perks: [],
		annualFee: null,
		...overrides,
	};
}

function merchantRule(merchant: string, ratePer100: number, cap: unknown = null) {
	return { label: merchant, ratePer100, categories: [], merchants: [merchant], cap };
}

function putBenefits(page: Page, accountId: string, data: Record<string, unknown>) {
	return page.request.put(`${API}/accounts/${accountId}/card-benefits`, { data });
}

async function setBenefits(page: Page, accountId: string, data: Record<string, unknown>) {
	const res = await putBenefits(page, accountId, data);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: NonNullable<CreditCard["benefits"]> }).data;
}

async function charge(
	page: Page,
	bankAccountId: string,
	name: string,
	amount: number,
	date = today(),
) {
	const res = await page.request.post(`${API}/transactions`, {
		data: { name, amount, date, bankAccountId },
	});
	expect(res.status()).toBe(201);
	return ((await res.json()) as { data: Purchase }).data;
}

async function purchase(page: Page, id: string) {
	const res = await page.request.get(`${API}/transactions/${id}`);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: Purchase }).data;
}

async function creditCards(page: Page) {
	const res = await page.request.get(`${API}/credit-cards`);
	expect(res.status()).toBe(200);
	return ((await res.json()) as { data: CreditCard[] }).data;
}

async function creditCard(page: Page, id: string) {
	const found = (await creditCards(page)).find((entry) => entry.id === id);
	if (!found) throw new Error("No credit card");
	return found;
}

async function monthRewards(page: Page, id: string) {
	const rewards = (await creditCard(page, id)).rewards;
	if (!rewards) throw new Error("No rewards");
	return rewards.month;
}

async function otherUserPage(page: Page) {
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error("No browser");
	const other = await context.newPage();
	await signUp(other);
	return { other, close: () => context.close() };
}

unsigned("credit card APIs reject an unauthenticated request", async ({ request }) => {
	const id = randomUUID();
	unsignedExpect((await request.get(`${API}/credit-cards`)).status()).toBe(401);
	unsignedExpect((await request.get(`${API}/credit-cards/presets`)).status()).toBe(401);
	unsignedExpect(
		(
			await request.put(`${API}/accounts/${id}/card-benefits`, {
				data: { presetKey: "flat-cash-back-1" },
			})
		).status(),
	).toBe(401);
	unsignedExpect((await request.delete(`${API}/accounts/${id}/card-benefits`)).status()).toBe(401);
});

test("the presets list has the issuer Card products and the generic ones", async ({ page }) => {
	const res = await page.request.get(`${API}/credit-cards/presets`);
	expect(res.status()).toBe(200);
	const presets = ((await res.json()) as { data: { key: string; issuer: string }[] }).data;
	expect(presets.map((preset) => preset.key)).toEqual([
		"apple-card",
		"blue-cash-preferred",
		"delta-skymiles-reserve",
		"hilton-honors-amex",
		"prime-visa",
		"sams-club-mastercard-plus",
		"sams-club-mastercard",
		"flat-cash-back-1",
		"flat-cash-back-1-5",
		"flat-cash-back-2",
	]);
	expect(presets.at(-1)).toEqual({
		key: "flat-cash-back-2",
		issuer: "Generic",
		productName: "Flat 2% cash back",
	});
});

test("a card has no benefits or rewards until a preset is applied", async ({ page }) => {
	const visa = await card(page, "Visa", { currentBalance: 25_000, creditLimit: 100_000 });

	const before = await creditCard(page, visa);
	expect(before.benefits).toBeNull();
	expect(before.rewards).toBeNull();
	expect(before.availableCredit).toBe(75_000);
	expect(before.utilization).toBe(0.25);
	expect(before.billingPeriod).toEqual({
		periodStart: daysAgo(30),
		closesOn: null,
		dueOn: null,
		spend: 0,
		latestStatement: null,
	});

	const stored = await setBenefits(page, visa, { presetKey: "flat-cash-back-1-5" });
	expect(stored).toEqual({
		presetKey: "flat-cash-back-1-5",
		productName: "Flat 1.5% cash back",
		rewardCurrency: "cash_back",
		unitValue: 100,
		baseRatePer100: 150,
		earnRules: [],
		credits: [],
		perks: [],
		annualFee: null,
	});

	const after = await creditCard(page, visa);
	expect(after.benefits?.presetKey).toBe("flat-cash-back-1-5");
	expect(after.rewards?.month).toEqual({
		from: `${today().slice(0, 8)}01`,
		to: today(),
		spend: 0,
		units: 0,
		value: 0,
		byRule: [],
	});
	expect(after.rewards?.year.from).toBe(`${today().slice(0, 4)}-01-01`);
	expect(after.rewards?.credits).toEqual([]);
});

test("custom Card benefits replace a preset, and cash back always has a unit value of 100", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, { presetKey: "flat-cash-back-2" });

	const stored = await setBenefits(page, visa, {
		benefits: customBenefits({ productName: "  My card  ", unitValue: 250, annualFee: 9_500 }),
	});
	expect(stored.presetKey).toBeNull();
	expect(stored.productName).toBe("My card");
	expect(stored.unitValue).toBe(100);
	expect((await creditCards(page)).filter((entry) => entry.id === visa)).toHaveLength(1);
});

test("Card benefits refuse an unknown preset, an invalid body, and a non-credit account", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	const cash = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 1_000,
	});
	const untargetedRule = {
		label: "Nothing",
		ratePer100: 300,
		categories: [],
		merchants: [],
		cap: null,
	};
	const invalidBodies = [
		{ presetKey: "no-such-card" },
		{ benefits: customBenefits({ earnRules: [untargetedRule] }) },
		{ benefits: customBenefits({ baseRatePer100: 10_001 }) },
		{ benefits: customBenefits({ earnRules: [merchantRule("Cafe", -1)] }) },
		{ benefits: customBenefits({ productName: "" }) },
		{ presetKey: "flat-cash-back-1", benefits: customBenefits() },
		{},
	];
	for (const body of invalidBodies) {
		expect((await putBenefits(page, visa, body)).status()).toBe(400);
	}
	expect((await putBenefits(page, cash, { presetKey: "flat-cash-back-1" })).status()).toBe(400);
	expect((await page.request.delete(`${API}/accounts/${cash}/card-benefits`)).status()).toBe(400);
	expect((await creditCard(page, visa)).benefits).toBeNull();
});

test("another User cannot change my Card benefits, list my cards, or be suggested my card", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, { benefits: customBenefits({ baseRatePer100: 500 }) });
	const { other, close } = await otherUserPage(page);
	try {
		expect((await putBenefits(other, visa, { presetKey: "flat-cash-back-1" })).status()).toBe(404);
		expect((await other.request.delete(`${API}/accounts/${visa}/card-benefits`)).status()).toBe(
			404,
		);
		expect(await creditCards(other)).toEqual([]);

		const theirs = await card(other, "Their card");
		await setBenefits(other, theirs, { presetKey: "flat-cash-back-1" });
		expect((await charge(other, theirs, "Corner Cafe", -4_000)).betterCard).toBeNull();
		expect((await creditCards(other)).map((entry) => entry.id)).toEqual([theirs]);
	} finally {
		await close();
	}
	expect((await creditCard(page, visa)).benefits?.presetKey).toBeNull();
	expect((await creditCards(page)).map((entry) => entry.id)).toEqual([visa]);
});

test("a flat 2% card earns 100 cents on a $50.00 purchase", async ({ page }) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, { presetKey: "flat-cash-back-2" });
	await charge(page, visa, "Hardware store", -5_000);

	const month = await monthRewards(page, visa);
	expect(month.spend).toBe(5_000);
	expect(month.units).toBe(100);
	expect(month.value).toBe(100);
	expect(month.byRule).toEqual([
		{ label: "Everything else", ratePer100: 200, spend: 5_000, units: 100, value: 100 },
	]);
	expect((await creditCard(page, visa)).rewards?.year.units).toBe(100);
});

test("a points card earns the merchant Earn rule and values points by the unit value", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, {
		benefits: customBenefits({
			rewardCurrency: "points",
			unitValue: 125,
			earnRules: [merchantRule("Bistro", 300)],
		}),
	});
	await charge(page, visa, "LE BISTRO 42", -10_000);

	const month = await monthRewards(page, visa);
	expect(month.units).toBe(300);
	expect(month.value).toBe(375);
	expect(month.byRule).toEqual([
		{ label: "Bistro", ratePer100: 300, spend: 10_000, units: 300, value: 375 },
	]);
});

test("spend past an Earn rule's cap earns the base rate", async ({ page }) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, {
		benefits: customBenefits({
			earnRules: [merchantRule("Market", 500, { amount: 5_000, period: "month" })],
		}),
	});
	await charge(page, visa, "Market", -8_000);

	const month = await monthRewards(page, visa);
	expect(month.byRule).toEqual([
		{ label: "Market", ratePer100: 500, spend: 5_000, units: 250, value: 250 },
		{ label: "Everything else", ratePer100: 100, spend: 3_000, units: 30, value: 30 },
	]);
	expect(month.spend).toBe(8_000);
	expect(month.units).toBe(280);
	expect(month.value).toBe(280);
});

test("a refund lowers Rewards earned and a Transfer earns nothing", async ({ page }) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, { presetKey: "flat-cash-back-2" });
	await charge(page, visa, "Hardware store", -5_000);
	expect((await monthRewards(page, visa)).units).toBe(100);

	await charge(page, visa, "Hardware store refund", 2_000);
	const afterRefund = await monthRewards(page, visa);
	expect(afterRefund.spend).toBe(3_000);
	expect(afterRefund.units).toBe(60);

	const payment = await charge(page, visa, "Card payment", 10_000);
	const tagged = await page.request.patch(`${API}/transactions/${payment.id}`, {
		data: { tags: ["transfer"] },
	});
	expect(tagged.status()).toBe(200);
	const afterPayment = await monthRewards(page, visa);
	expect(afterPayment.spend).toBe(3_000);
	expect(afterPayment.units).toBe(60);
	expect(afterPayment.value).toBe(60);
});

test("a monthly Benefit credit tracks used and remaining, capped at its amount", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, {
		benefits: customBenefits({
			credits: [
				{
					label: "Delivery credit",
					amount: 1_500,
					period: "month",
					categories: [],
					merchants: ["Grubhub"],
				},
			],
		}),
	});
	await charge(page, visa, "Hardware store", -9_000);
	await charge(page, visa, "GRUBHUB ORDER", -1_000);

	const first = (await creditCard(page, visa)).rewards?.credits;
	expect(first).toEqual([
		{
			label: "Delivery credit",
			amount: 1_500,
			period: "month",
			categories: [],
			merchants: ["Grubhub"],
			periodStart: `${today().slice(0, 8)}01`,
			periodEnd: monthEnd(today()),
			used: 1_000,
			remaining: 500,
		},
	]);

	await charge(page, visa, "Grubhub", -1_000);
	const second = (await creditCard(page, visa)).rewards?.credits[0];
	expect(second?.used).toBe(1_500);
	expect(second?.remaining).toBe(0);
});

test("a category Earn rule matches the Reward category mapped from the Plaid category", async ({
	page,
}) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, {
		benefits: customBenefits({
			earnRules: [
				{ label: "Dining", ratePer100: 400, categories: ["dining"], merchants: [], cap: null },
			],
		}),
	});
	const dinner = await charge(page, visa, "Dinner", -2_500);
	expect((await monthRewards(page, visa)).byRule).toEqual([
		{ label: "Everything else", ratePer100: 100, spend: 2_500, units: 25, value: 25 },
	]);

	setPfcDetailed(dinner.id, "FOOD_AND_DRINK_RESTAURANT");
	expect((await monthRewards(page, visa)).byRule).toEqual([
		{ label: "Dining", ratePer100: 400, spend: 2_500, units: 100, value: 100 },
	]);

	setPfcDetailed(dinner.id, "FOOD_AND_DRINK_GROCERIES");
	expect((await monthRewards(page, visa)).byRule[0]?.label).toBe("Everything else");
});

test("a merchant Earn rule matches whole words, not part of another name", async ({ page }) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, {
		benefits: customBenefits({ earnRules: [merchantRule("Apple", 300)] }),
	});
	await charge(page, visa, "Applebee's Grill", -1_000);
	await charge(page, visa, "Apple.com/bill", -1_000);
	expect((await monthRewards(page, visa)).byRule).toEqual([
		{ label: "Apple", ratePer100: 300, spend: 1_000, units: 30, value: 30 },
		{ label: "Everything else", ratePer100: 100, spend: 1_000, units: 10, value: 10 },
	]);
});

test("Blue Cash Preferred earns 6% at supermarkets and tracks the Disney credit", async ({
	page,
}) => {
	const amex = await card(page, "Blue Cash");
	await setBenefits(page, amex, { presetKey: "blue-cash-preferred" });
	const groceries = await charge(page, amex, "Neighborhood Market", -10_000);
	setPfcDetailed(groceries.id, "FOOD_AND_DRINK_GROCERIES");
	await charge(page, amex, "Disney Plus", -1_399);

	const rewards = (await creditCard(page, amex)).rewards;
	expect(rewards?.month.byRule.find((line) => line.label === "Supermarkets")).toEqual({
		label: "Supermarkets",
		ratePer100: 600,
		spend: 10_000,
		units: 600,
		value: 600,
	});
	const disney = rewards?.credits.find((credit) => credit.label === "Disney streaming credit");
	expect(disney?.used).toBe(1_000);
	expect(disney?.remaining).toBe(0);
});

test("Apple Card is the Better card for Uber on Delta Reserve, at its 3% partner rate", async ({
	page,
}) => {
	const apple = await card(page, "Apple Card");
	const delta = await card(page, "Delta Reserve");
	await setBenefits(page, apple, { presetKey: "apple-card" });
	await setBenefits(page, delta, { presetKey: "delta-skymiles-reserve" });

	const ride = await charge(page, delta, "Uber Trip", -2_000);
	expect((await purchase(page, ride.id)).betterCard).toMatchObject({
		accountId: apple,
		extraValue: 60 - 24,
	});
	const dinner = await charge(page, delta, "Applebee's", -2_000);
	expect((await purchase(page, dinner.id)).betterCard).toMatchObject({
		accountId: apple,
		extraValue: 40 - 24,
	});
});

test("Better card names the other card that would have earned more", async ({ page }) => {
	const alpha = await card(page, "Alpha");
	const bravo = await card(page, "Bravo");
	const checking = await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 100_000,
	});
	await setBenefits(page, alpha, { presetKey: "flat-cash-back-1" });
	await setBenefits(page, bravo, {
		benefits: customBenefits({ earnRules: [merchantRule("Cafe", 300)] }),
	});

	const onAlpha = await charge(page, alpha, "Corner Cafe", -4_000);
	expect(onAlpha.betterCard).toEqual({
		accountId: bravo,
		name: "Bravo",
		mask: null,
		extraValue: 80,
	});
	expect((await charge(page, bravo, "Corner Cafe", -4_000)).betterCard).toBeNull();
	expect((await charge(page, checking, "Corner Cafe", -4_000)).betterCard).toBeNull();
	expect((await charge(page, alpha, "Hardware store", -4_000)).betterCard).toBeNull();
	expect((await charge(page, alpha, "Corner Cafe refund", 4_000)).betterCard).toBeNull();

	const feed = await page.request.get(`${API}/transactions?accountId=${alpha}`);
	const rows = ((await feed.json()) as { data: Purchase[] }).data;
	expect(rows.find((row) => row.id === onAlpha.id)?.betterCard?.accountId).toBe(bravo);

	const tagged = await page.request.patch(`${API}/transactions/${onAlpha.id}`, {
		data: { tags: ["transfer"] },
	});
	expect(((await tagged.json()) as { data: Purchase }).data.betterCard).toBeNull();
});

test("a card without Card benefits is worth nothing next to one that has them", async ({
	page,
}) => {
	const plain = await card(page, "Plain");
	const flat = await card(page, "Flat");
	await setBenefits(page, flat, { presetKey: "flat-cash-back-1" });

	expect((await charge(page, plain, "Hardware store", -4_000)).betterCard).toEqual({
		accountId: flat,
		name: "Flat",
		mask: null,
		extraValue: 40,
	});
	expect((await charge(page, flat, "Hardware store", -4_000)).betterCard).toBeNull();
});

test("Better card picks the highest value and breaks ties by name", async ({ page }) => {
	const paying = await card(page, "Paying");
	const zulu = await card(page, "Zulu");
	const mike = await card(page, "Mike");
	const kilo = await card(page, "Kilo");
	await setBenefits(page, paying, { presetKey: "flat-cash-back-1" });
	await setBenefits(page, zulu, { presetKey: "flat-cash-back-2" });
	await setBenefits(page, mike, { presetKey: "flat-cash-back-2" });
	await setBenefits(page, kilo, { presetKey: "flat-cash-back-1-5" });

	const bought = await charge(page, paying, "Hardware store", -10_000);
	expect(bought.betterCard).toMatchObject({ accountId: mike, name: "Mike", extraValue: 100 });

	await setBenefits(page, kilo, {
		benefits: customBenefits({ rewardCurrency: "points", unitValue: 150, baseRatePer100: 200 }),
	});
	expect((await purchase(page, bought.id)).betterCard).toMatchObject({
		accountId: kilo,
		extraValue: 200,
	});
});

test("a hidden card and a card in another currency are never the Better card", async ({ page }) => {
	seedFxRate("BRL", "USD", "0.2");
	const alpha = await card(page, "Alpha");
	const bravo = await card(page, "Bravo");
	const brazil = await card(page, "Brazil", { isoCurrencyCode: "BRL" });
	await setBenefits(page, alpha, { presetKey: "flat-cash-back-1" });
	await setBenefits(page, bravo, { presetKey: "flat-cash-back-2" });
	await setBenefits(page, brazil, { benefits: customBenefits({ baseRatePer100: 500 }) });

	const bought = await charge(page, alpha, "Hardware store", -4_000);
	expect(bought.betterCard?.accountId).toBe(bravo);

	const hidden = await page.request.patch(`${API}/accounts/${bravo}`, {
		data: { isHidden: true },
	});
	expect(hidden.status()).toBe(200);
	expect((await purchase(page, bought.id)).betterCard).toBeNull();
});

test("the open Statement period's Transactions carry the Better card", async ({ page }) => {
	const alpha = await card(page, "Alpha");
	const bravo = await card(page, "Bravo");
	await setBenefits(page, alpha, { presetKey: "flat-cash-back-1" });
	await setBenefits(page, bravo, { presetKey: "flat-cash-back-2" });
	const bought = await charge(page, alpha, "Hardware store", -4_000);

	const res = await page.request.get(`${API}/accounts/${alpha}/statements?periodEnd=open`);
	expect(res.status()).toBe(200);
	const period = ((await res.json()) as { data: { transactions: Purchase[] } }).data;
	expect(period.transactions).toHaveLength(1);
	expect(period.transactions[0]?.id).toBe(bought.id);
	expect(period.transactions[0]?.betterCard).toEqual({
		accountId: bravo,
		name: "Bravo",
		mask: null,
		extraValue: 40,
	});
});

test("the billing period starts the day after the latest Statement closes", async ({ page }) => {
	const visa = await card(page, "Visa", { currentBalance: 45_000 });
	const created = await page.request.post(`${API}/accounts/${visa}/statements`, {
		data: {
			periodStart: daysAgo(40),
			periodEnd: daysAgo(10),
			statementBalance: 30_000,
			minimumPayment: 2_500,
			dueDate: daysAgo(-15),
		},
	});
	expect(created.status()).toBe(201);
	await charge(page, visa, "Before the close", -10_000, daysAgo(20));
	await charge(page, visa, "On the close", -2_000, daysAgo(10));
	await charge(page, visa, "After the close", -15_000, daysAgo(5));
	await charge(page, visa, "Refund after the close", 1_000, daysAgo(4));

	const billing = (await creditCard(page, visa)).billingPeriod;
	expect(billing.periodStart).toBe(daysAgo(9));
	expect(billing.spend).toBe(14_000);
	expect(billing.dueOn).toBe(daysAgo(-15));
	expect(billing.latestStatement?.statementBalance).toBe(30_000);

	const closesOn = billing.closesOn ?? "";
	expect(closesOn >= today()).toBe(true);
	expect(closesOn <= daysAgo(-31)).toBe(true);
	const closeDay = Number(daysAgo(10).slice(8, 10));
	const lastDayOfCloseMonth = Number(monthEnd(closesOn).slice(8, 10));
	expect(Number(closesOn.slice(8, 10))).toBe(Math.min(closeDay, lastDayOfCloseMonth));
});

test("Card terms set the close and due dates when there is no Statement", async ({ page }) => {
	const visa = await card(page, "Visa");
	const day = Number(today().slice(8, 10));
	const patched = await page.request.patch(`${API}/accounts/${visa}`, {
		data: { statementCloseDay: day, paymentDueDay: day },
	});
	expect(patched.status()).toBe(200);

	const billing = (await creditCard(page, visa)).billingPeriod;
	expect(billing.closesOn).toBe(today());
	expect(billing.dueOn).toBe(today());
});

test("credit cards are listed by name, without hidden cards or other accounts", async ({
	page,
}) => {
	const zed = await card(page, "Zed");
	const amex = await card(page, "Amex");
	const hiddenCard = await card(page, "Hidden");
	await createAccount(page, {
		name: "Checking",
		type: "checking",
		displayGroup: "cash",
		currentBalance: 1_000,
	});
	const hidden = await page.request.patch(`${API}/accounts/${hiddenCard}`, {
		data: { isHidden: true },
	});
	expect(hidden.status()).toBe(200);

	expect((await creditCards(page)).map((entry) => entry.id)).toEqual([amex, zed]);
});

test("deleting Card benefits clears benefits and rewards", async ({ page }) => {
	const visa = await card(page, "Visa");
	await setBenefits(page, visa, { presetKey: "flat-cash-back-2" });
	await charge(page, visa, "Hardware store", -5_000);
	expect((await creditCard(page, visa)).rewards?.month.units).toBe(100);

	const removed = await page.request.delete(`${API}/accounts/${visa}/card-benefits`);
	expect(removed.status()).toBe(200);
	expect(await removed.json()).toEqual({ data: null });

	const after = await creditCard(page, visa);
	expect(after.benefits).toBeNull();
	expect(after.rewards).toBeNull();
	expect((await page.request.delete(`${API}/accounts/${visa}/card-benefits`)).status()).toBe(200);
});
