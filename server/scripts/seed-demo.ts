/**
 * Seeds Plaid-shaped demo data for one local User so every screen has something to show:
 * three PlaidItems (checking, savings, credit card, brokerage, auto loan), transactions
 * from the first of the month two months back through today, paired transfers, a refund,
 * a few pending and Uncategorized rows, and daily balance snapshots that agree with them.
 *
 * Re-running replaces the previous demo data for that User. Nothing here talks to Plaid,
 * so "Refresh all" on these institutions will fail with an invalid token: that is expected.
 *
 * Usage: pnpm db:seed-demo you@example.com
 */
import { join } from "node:path";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DEFAULT_CATEGORIES } from "../src/categories/category-defaults";
import { encryptToken } from "../src/crypto/token-crypto";
import * as schema from "../src/db/schema";

const { accountBalanceSnapshot, bankAccount, category, plaidItem, transaction, user } = schema;

const SEED = "seed-demo";

try {
	process.loadEnvFile(join(__dirname, "..", ".env"));
} catch {
	// Fall back to the shell environment.
}

const email = process.argv[2];
if (!email) {
	console.error("Usage: pnpm db:seed-demo <email of an existing local User>");
	process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL;
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!databaseUrl || !encryptionKey) {
	console.error("DATABASE_URL and ENCRYPTION_KEY must be set (server/.env).");
	process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Dates and randomness

function isoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

const todayDate = new Date(`${isoDate(new Date())}T00:00:00Z`);
const today = isoDate(todayDate);
const startDate = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - 2, 1));

function days(): Date[] {
	const out: Date[] = [];
	for (let day = new Date(startDate); day <= todayDate; day.setUTCDate(day.getUTCDate() + 1)) {
		out.push(new Date(day));
	}
	return out;
}

/** mulberry32: same data on every run. */
function rng(seed: number) {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const random = rng(20261111);
const chance = (p: number) => random() < p;
const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 100);
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;

// ---------------------------------------------------------------------------------------------
// Accounts

type AccountKey = "checking" | "savings" | "card" | "brokerage" | "auto";

const ITEMS = [
	{ key: "chase", name: "Chase", institutionId: "ins_56" },
	{ key: "vanguard", name: "Vanguard", institutionId: "ins_115616" },
	{ key: "ally", name: "Ally Auto", institutionId: "ins_25" },
] as const;

const ACCOUNTS: Record<
	AccountKey,
	{
		item: (typeof ITEMS)[number]["key"];
		name: string;
		officialName: string;
		type: string;
		subtype: string;
		displayGroup: string;
		mask: string;
		openingBalance: number; // cents on the start date; owed amount for liabilities
		creditLimit?: number;
	}
> = {
	checking: {
		item: "chase",
		name: "Total Checking",
		officialName: "Chase Total Checking",
		type: "depository",
		subtype: "checking",
		displayGroup: "cash",
		mask: "4417",
		openingBalance: 3_120_45,
	},
	savings: {
		item: "chase",
		name: "Chase Savings",
		officialName: "Chase Savings",
		type: "depository",
		subtype: "savings",
		displayGroup: "cash",
		mask: "9921",
		openingBalance: 11_400_00,
	},
	card: {
		item: "chase",
		name: "Sapphire Preferred",
		officialName: "Chase Sapphire Preferred Visa",
		type: "credit",
		subtype: "credit card",
		displayGroup: "credit",
		mask: "3056",
		openingBalance: 1_046_18,
		creditLimit: 12_000_00,
	},
	brokerage: {
		item: "vanguard",
		name: "Brokerage",
		officialName: "Vanguard Individual Brokerage",
		type: "investment",
		subtype: "brokerage",
		displayGroup: "investment",
		mask: "7710",
		openingBalance: 36_850_00,
	},
	auto: {
		item: "ally",
		name: "Auto Loan",
		officialName: "Ally Auto Loan",
		type: "loan",
		subtype: "auto",
		displayGroup: "loan",
		mask: "5582",
		openingBalance: 15_340_00,
	},
};

const isAsset = (key: AccountKey) =>
	ACCOUNTS[key].type !== "credit" && ACCOUNTS[key].type !== "loan";

// ---------------------------------------------------------------------------------------------
// Transactions

type Row = {
	account: AccountKey;
	date: string;
	name: string;
	merchant: string | null;
	amount: number; // cents, positive = money in
	category: string;
	pfc: string;
	pending?: boolean;
	tag?: "transfer" | "savings_transfer";
};

function generate(): Row[] {
	const rows: Row[] = [];
	const add = (row: Row) => rows.push(row);
	const allDays = days();
	const lastDay = allDays.length - 1;
	let cardOwed = ACCOUNTS.card.openingBalance;

	allDays.forEach((day, index) => {
		const date = isoDate(day);
		const dom = day.getUTCDate();
		const dow = day.getUTCDay();
		const weekend = dow === 0 || dow === 6;
		const recent = index >= lastDay - 1;
		const card = (row: Omit<Row, "account">) => {
			add({ ...row, account: "card", pending: row.pending ?? (recent && chance(0.6)) });
			cardOwed -= row.amount;
		};

		// Income and fixed bills from checking.
		if (dom === 1 || dom === 15) {
			add({
				account: "checking",
				date,
				name: "ACME CORP PAYROLL PPD",
				merchant: "Acme Corp",
				amount: 3_250_00,
				category: "Salary",
				pfc: "INCOME",
			});
		}
		if (dom === 1) {
			add({
				account: "checking",
				date,
				name: "MAPLE ST APTS RENT",
				merchant: "Maple Street Apartments",
				amount: -1_850_00,
				category: "Housing",
				pfc: "RENT_AND_UTILITIES",
			});
		}
		if (dom === 5) {
			add({
				account: "checking",
				date,
				name: "CON ED OF NY ELECTRIC",
				merchant: "Con Edison",
				amount: -between(88, 142),
				category: "Utilities",
				pfc: "RENT_AND_UTILITIES",
			});
		}
		if (dom === 12) {
			add({
				account: "checking",
				date,
				name: "COMCAST XFINITY",
				merchant: "Xfinity",
				amount: -79_99,
				category: "Utilities",
				pfc: "RENT_AND_UTILITIES",
			});
		}
		if (dom === 18) {
			add({
				account: "checking",
				date,
				name: "VERIZON WIRELESS PAYMENT",
				merchant: "Verizon",
				amount: -65_00,
				category: "Utilities",
				pfc: "RENT_AND_UTILITIES",
			});
		}
		if (dom === 20) {
			add({
				account: "checking",
				date,
				name: "GEICO AUTO INSURANCE",
				merchant: "GEICO",
				amount: -128_40,
				category: "Insurance",
				pfc: "GENERAL_SERVICES",
			});
		}
		if (dom === 10) {
			add({
				account: "checking",
				date,
				name: "ALLY AUTO PAYMENT",
				merchant: "Ally",
				amount: -389_00,
				category: "Debt Payment",
				pfc: "LOAN_PAYMENTS",
				tag: "transfer",
			});
			add({
				account: "auto",
				date,
				name: "PAYMENT RECEIVED - THANK YOU",
				merchant: null,
				amount: 389_00,
				category: "Uncategorized",
				pfc: "TRANSFER_IN",
				tag: "transfer",
			});
		}
		if (dom === 16) {
			add({
				account: "checking",
				date,
				name: "TRANSFER TO SAV XXXXX9921",
				merchant: null,
				amount: -500_00,
				category: "Savings Transfer",
				pfc: "TRANSFER_OUT",
				tag: "savings_transfer",
			});
			add({
				account: "savings",
				date,
				name: "TRANSFER FROM CHK XXXXX4417",
				merchant: null,
				amount: 500_00,
				category: "Uncategorized",
				pfc: "TRANSFER_IN",
				tag: "savings_transfer",
			});
		}
		if (dom === 25) {
			add({
				account: "checking",
				date,
				name: "GIVING - RED CROSS",
				merchant: "American Red Cross",
				amount: -50_00,
				category: "Giving",
				pfc: "GOVERNMENT_AND_NON_PROFIT",
			});
		}
		if (dom === 28) {
			add({
				account: "savings",
				date,
				name: "INTEREST PAYMENT",
				merchant: null,
				amount: between(9, 12),
				category: "Salary",
				pfc: "INCOME",
			});
		}

		// Pay the card in full on the 25th, both sides tagged as a transfer.
		if (dom === 25 && cardOwed > 0) {
			const payment = cardOwed;
			add({
				account: "checking",
				date,
				name: "CHASE CREDIT CRD AUTOPAY",
				merchant: "Chase",
				amount: -payment,
				category: "Debt Payment",
				pfc: "LOAN_PAYMENTS",
				tag: "transfer",
			});
			add({
				account: "card",
				date,
				name: "AUTOMATIC PAYMENT - THANK YOU",
				merchant: null,
				amount: payment,
				category: "Uncategorized",
				pfc: "TRANSFER_IN",
				tag: "transfer",
			});
			cardOwed = 0;
		}

		// Subscriptions on the card.
		if (dom === 7)
			card({
				date,
				name: "NETFLIX.COM",
				merchant: "Netflix",
				amount: -15_49,
				category: "Subscriptions",
				pfc: "ENTERTAINMENT",
			});
		if (dom === 12)
			card({
				date,
				name: "SPOTIFY USA",
				merchant: "Spotify",
				amount: -11_99,
				category: "Subscriptions",
				pfc: "ENTERTAINMENT",
			});
		if (dom === 17)
			card({
				date,
				name: "PLANET FITNESS",
				merchant: "Planet Fitness",
				amount: -24_99,
				category: "Subscriptions",
				pfc: "PERSONAL_CARE",
			});
		if (dom === 22)
			card({
				date,
				name: "APPLE.COM/BILL",
				merchant: "Apple",
				amount: -2_99,
				category: "Subscriptions",
				pfc: "GENERAL_SERVICES",
			});

		// Everyday spending on the card.
		if (chance(weekend ? 0.45 : 0.25)) {
			const store = pick(["Whole Foods Market", "Trader Joe's", "Costco", "Safeway"] as const);
			card({
				date,
				name: store.toUpperCase(),
				merchant: store,
				amount: -between(store === "Costco" ? 90 : 28, store === "Costco" ? 240 : 115),
				category: "Groceries",
				pfc: "FOOD_AND_DRINK",
			});
		}
		if (!weekend && chance(0.6)) {
			card({
				date,
				name: "STARBUCKS STORE",
				merchant: "Starbucks",
				amount: -between(4.5, 8.75),
				category: "Dining",
				pfc: "FOOD_AND_DRINK",
			});
		}
		if (chance(0.35)) {
			const place = pick(["Chipotle", "Sweetgreen", "Shake Shack", "DoorDash"] as const);
			card({
				date,
				name: place.toUpperCase(),
				merchant: place,
				amount: -between(place === "DoorDash" ? 24 : 11, place === "DoorDash" ? 48 : 19),
				category: "Dining",
				pfc: "FOOD_AND_DRINK",
			});
		}
		if (weekend && chance(0.4)) {
			const place = pick([
				"Carbone",
				"Joe's Pizza",
				"Le Bernardin",
				"Katz's Delicatessen",
			] as const);
			card({
				date,
				name: place.toUpperCase(),
				merchant: place,
				amount: -between(38, 135),
				category: "Dining",
				pfc: "FOOD_AND_DRINK",
			});
		}
		if (chance(0.3)) {
			card({
				date,
				name: "UBER *TRIP",
				merchant: "Uber",
				amount: -between(11, 34),
				category: "Transport",
				pfc: "TRANSPORTATION",
			});
		}
		if (index % 9 === 3) {
			card({
				date,
				name: "SHELL OIL 5744",
				merchant: "Shell",
				amount: -between(38, 58),
				category: "Transport",
				pfc: "TRANSPORTATION",
			});
		}
		if (chance(0.22)) {
			card({
				date,
				name: "AMAZON.COM*MK2",
				merchant: "Amazon",
				amount: -between(12, 128),
				category: "Shopping",
				pfc: "GENERAL_MERCHANDISE",
			});
		}
		if (chance(0.06)) {
			card({
				date,
				name: "TARGET T-1234",
				merchant: "Target",
				amount: -between(20, 95),
				category: "Shopping",
				pfc: "GENERAL_MERCHANDISE",
			});
		}
		if (weekend && chance(0.18)) {
			card({
				date,
				name: "AMC THEATRES",
				merchant: "AMC Theatres",
				amount: -between(18, 42),
				category: "Entertainment",
				pfc: "ENTERTAINMENT",
			});
		}
		if (chance(0.05)) {
			card({
				date,
				name: "CVS/PHARMACY #0421",
				merchant: "CVS Pharmacy",
				amount: -between(9, 46),
				category: "Healthcare",
				pfc: "MEDICAL",
			});
		}
		// Venmo comes through Uncategorized, the way Plaid usually sends it.
		if (chance(0.05)) {
			add({
				account: "checking",
				date,
				name: "VENMO PAYMENT 1029384",
				merchant: "Venmo",
				amount: -between(15, 60),
				category: "Uncategorized",
				pfc: "TRANSFER_OUT",
			});
		}
	});

	// A few one-offs: a refund, a course, and a doctor visit.
	const at = (offset: number) => isoDate(new Date(startDate.getTime() + offset * 86_400_000));
	add({
		account: "card",
		date: at(12),
		name: "AMAZON.COM REFUND",
		merchant: "Amazon",
		amount: 34_99,
		category: "Shopping",
		pfc: "GENERAL_MERCHANDISE",
	});
	add({
		account: "card",
		date: at(40),
		name: "COURSERA.ORG",
		merchant: "Coursera",
		amount: -49_00,
		category: "Education",
		pfc: "GENERAL_SERVICES",
	});
	add({
		account: "checking",
		date: at(27),
		name: "CITYMD URGENT CARE",
		merchant: "CityMD",
		amount: -75_00,
		category: "Healthcare",
		pfc: "MEDICAL",
	});
	return rows;
}

// ---------------------------------------------------------------------------------------------
// Write

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle({ client, schema });

async function main() {
	const [owner] = await db.select().from(user).where(eq(user.email, email)).limit(1);
	if (!owner) {
		throw new Error(`No User with email ${email}. Sign up in the app first.`);
	}
	const userId = owner.id;

	const rows = generate().sort((a, b) => a.date.localeCompare(b.date));

	await db.transaction(async (tx) => {
		// Clear earlier demo data. Snapshots cascade with their BankAccount.
		await tx
			.delete(transaction)
			.where(
				and(eq(transaction.userId, userId), like(transaction.plaidTransactionId, `${SEED}-%`)),
			);
		await tx
			.delete(bankAccount)
			.where(and(eq(bankAccount.userId, userId), like(bankAccount.plaidAccountId, `${SEED}-%`)));
		await tx
			.delete(plaidItem)
			.where(and(eq(plaidItem.userId, userId), like(plaidItem.plaidItemId, `${SEED}-%`)));

		// Default Categories, the same way CategoriesService.ensureDefaults makes them.
		await tx
			.insert(category)
			.values(
				DEFAULT_CATEGORIES.map((seed) => ({
					userId,
					name: seed.name,
					icon: seed.icon,
					color: seed.color,
					kind: seed.kind,
					budgetGroup: seed.budgetGroup,
					isDefault: true,
					isUncategorized: seed.isUncategorized ?? false,
				})),
			)
			.onConflictDoNothing();
		const categories = await tx
			.select({ id: category.id, name: category.name })
			.from(category)
			.where(
				and(
					eq(category.userId, userId),
					inArray(category.name, [...new Set(rows.map((row) => row.category))]),
				),
			);
		const categoryId = new Map(categories.map((row) => [row.name, row.id]));

		const now = new Date();
		const itemIds = new Map<string, string>();
		for (const item of ITEMS) {
			const [created] = await tx
				.insert(plaidItem)
				.values({
					userId,
					plaidItemId: `${SEED}-${item.key}`,
					accessToken: encryptToken(`access-sandbox-${SEED}-${item.key}`, encryptionKey as string),
					institutionId: item.institutionId,
					institutionName: item.name,
					status: "active",
					lastSyncedAt: now,
				})
				.returning({ id: plaidItem.id });
			itemIds.set(item.key, created?.id as string);
		}

		// Walk each account forward from its opening balance to get today's balance and a
		// snapshot for every day. Liabilities store the amount owed as a positive number.
		const keys = Object.keys(ACCOUNTS) as AccountKey[];
		const accountIds = new Map<AccountKey, string>();
		const snapshots: (typeof accountBalanceSnapshot.$inferInsert)[] = [];
		for (const key of keys) {
			const spec = ACCOUNTS[key];
			const byDate = new Map<string, number>();
			for (const row of rows.filter((row) => row.account === key)) {
				byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amount);
			}
			const daily: { date: string; balance: number }[] = [];
			let balance = spec.openingBalance;
			for (const day of days()) {
				const date = isoDate(day);
				const moved = byDate.get(date) ?? 0;
				balance += isAsset(key) ? moved : -moved;
				if (key === "brokerage") {
					// Markets drift; contributions are not modelled.
					balance = Math.round(balance * (1 + (random() - 0.47) * 0.012));
				}
				daily.push({ date, balance });
			}

			const [created] = await tx
				.insert(bankAccount)
				.values({
					userId,
					plaidItemId: itemIds.get(spec.item),
					plaidAccountId: `${SEED}-${key}`,
					source: "plaid",
					name: spec.name,
					officialName: spec.officialName,
					displayGroup: spec.displayGroup,
					type: spec.type,
					subtype: spec.subtype,
					mask: spec.mask,
					currentBalance: balance,
					availableBalance:
						key === "card" && spec.creditLimit
							? spec.creditLimit - balance
							: isAsset(key)
								? balance
								: null,
					creditLimit: spec.creditLimit ?? null,
					isoCurrencyCode: "USD",
					isAsset: isAsset(key),
					lastSyncedAt: now,
				})
				.returning({ id: bankAccount.id });
			const id = created?.id as string;
			accountIds.set(key, id);
			for (const point of daily) {
				snapshots.push({ userId, bankAccountId: id, date: point.date, balance: point.balance });
			}
		}
		await tx.insert(accountBalanceSnapshot).values(snapshots);

		await tx.insert(transaction).values(
			rows.map((row, index) => {
				const id = categoryId.get(row.category);
				if (!id) throw new Error(`Missing Category ${row.category}`);
				return {
					userId,
					bankAccountId: accountIds.get(row.account),
					categoryId: id,
					plaidTransactionId: `${SEED}-${String(index).padStart(4, "0")}`,
					name: row.name,
					merchantName: row.merchant,
					amount: row.amount,
					isoCurrencyCode: "USD",
					date: row.date,
					pending: row.pending ?? false,
					plaidPfcPrimary: row.pfc,
					tags: row.tag ? [row.tag] : [],
				};
			}),
		);
	});

	console.log(
		`Seeded ${rows.length} transactions across ${Object.keys(ACCOUNTS).length} accounts for ${email}, ${isoDate(startDate)} to ${today}.`,
	);
}

main()
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => client.end());
