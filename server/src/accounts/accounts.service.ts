import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { accountBalanceSnapshot } from "../db/schema/account-balance-snapshot";
import { bankAccount } from "../db/schema/bank-account";
import { plaidItem } from "../db/schema/plaid-item";
import { userSettings } from "../db/schema/user-settings";
import { FxService } from "../fx/fx.service";
import {
	type BankAccountDto,
	DISPLAY_GROUPS,
	type DisplayGroup,
	type GroupSummary,
	isAssetType,
	type NetWorthRange,
	type NetWorthResponse,
} from "./accounts.types";

@Injectable()
export class AccountsService {
	constructor(
		@Inject(DATABASE) private readonly db: PostgresJsDatabase,
		private readonly fx: FxService,
	) {}

	async list(userId: string): Promise<BankAccountDto[]> {
		const rows = await this.db
			.select({
				account: bankAccount,
				institutionName: plaidItem.institutionName,
				institutionLogo: plaidItem.institutionLogo,
				plaidItemStatus: plaidItem.status,
				errorCode: plaidItem.errorCode,
			})
			.from(bankAccount)
			.leftJoin(plaidItem, eq(bankAccount.plaidItemId, plaidItem.id))
			.where(eq(bankAccount.userId, userId));

		const from = shiftDays(today(), -29);
		const snapshots = await this.db
			.select()
			.from(accountBalanceSnapshot)
			.where(
				and(eq(accountBalanceSnapshot.userId, userId), gte(accountBalanceSnapshot.date, from)),
			);

		const byAccount = new Map<string, { date: string; value: number }[]>();
		for (const snap of snapshots) {
			const list = byAccount.get(snap.bankAccountId) ?? [];
			list.push({ date: snap.date, value: snap.balance });
			byAccount.set(snap.bankAccountId, list);
		}

		return rows.map((row) =>
			toDto(
				row.account,
				row.institutionName,
				row.institutionLogo,
				row.plaidItemStatus,
				row.errorCode,
				byAccount.get(row.account.id) ?? [],
			),
		);
	}

	async create(
		userId: string,
		input: {
			name: string;
			type: string;
			displayGroup: DisplayGroup;
			currentBalance: number;
			isoCurrencyCode?: string;
			creditLimit?: number | null;
		},
	) {
		const isAsset = isAssetType(input.type);
		const [row] = await this.db
			.insert(bankAccount)
			.values({
				userId,
				source: "manual",
				name: input.name,
				type: input.type,
				displayGroup: input.displayGroup,
				currentBalance: input.currentBalance,
				creditLimit: input.creditLimit ?? null,
				isoCurrencyCode: (input.isoCurrencyCode ?? "USD").toUpperCase(),
				isAsset,
			})
			.returning();
		if (!row) {
			throw new NotFoundException();
		}
		await this.upsertSnapshot(userId, row.id, row.currentBalance);
		return this.get(userId, row.id);
	}

	async update(
		userId: string,
		id: string,
		input: {
			name?: string;
			currentBalance?: number;
			creditLimit?: number | null;
			isHidden?: boolean;
		},
	) {
		const existing = await this.ownedBankAccount(userId, id);
		const [row] = await this.db
			.update(bankAccount)
			.set({
				name: input.name ?? existing.name,
				currentBalance: input.currentBalance ?? existing.currentBalance,
				creditLimit: input.creditLimit === undefined ? existing.creditLimit : input.creditLimit,
				isHidden: input.isHidden ?? existing.isHidden,
				updatedAt: new Date(),
			})
			.where(and(eq(bankAccount.id, id), eq(bankAccount.userId, userId)))
			.returning();
		if (!row) {
			throw new NotFoundException();
		}
		if (input.currentBalance !== undefined) {
			await this.upsertSnapshot(userId, row.id, row.currentBalance);
		}
		return this.get(userId, row.id);
	}

	async remove(userId: string, id: string) {
		const existing = await this.ownedBankAccount(userId, id);
		if (existing.source !== "manual") {
			throw new ForbiddenException("Disconnect the PlaidItem instead");
		}
		await this.db
			.delete(bankAccount)
			.where(and(eq(bankAccount.id, id), eq(bankAccount.userId, userId)));
		return { success: true };
	}

	async get(userId: string, id: string): Promise<BankAccountDto> {
		const found = (await this.list(userId)).find((item) => item.id === id);
		if (!found) {
			throw new NotFoundException();
		}
		return found;
	}

	async upsertSnapshot(userId: string, bankAccountId: string, balance: number) {
		await this.db
			.insert(accountBalanceSnapshot)
			.values({
				userId,
				bankAccountId,
				date: today(),
				balance,
			})
			.onConflictDoUpdate({
				target: [accountBalanceSnapshot.bankAccountId, accountBalanceSnapshot.date],
				set: { balance },
			});
	}

	private async ownedBankAccount(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(bankAccount)
			.where(and(eq(bankAccount.id, id), eq(bankAccount.userId, userId)))
			.limit(1);
		if (!row) {
			throw new NotFoundException();
		}
		return row;
	}

	async netWorth(userId: string, range: NetWorthRange = "1m"): Promise<NetWorthResponse> {
		const base = await this.baseCurrency(userId);
		const accounts = await this.db.select().from(bankAccount).where(eq(bankAccount.userId, userId));
		const visible = accounts.filter((row) => !row.isHidden);
		const emptyGroups = DISPLAY_GROUPS.map((group) => ({ group, total: 0, change: 0 }));

		if (visible.length === 0) {
			return {
				current: 0,
				change: 0,
				changePercent: 0,
				baseCurrency: base,
				series: [],
				assets: [],
				liabilities: [],
				groups: emptyGroups,
			};
		}

		const assetTotals = new Map<string, number>();
		const liabilityTotals = new Map<string, number>();
		let assetSum = 0;
		let liabilitySum = 0;

		for (const row of visible) {
			const converted = await this.fx.convert(row.currentBalance, row.isoCurrencyCode, base);
			if (converted === null) {
				continue;
			}
			if (row.isAsset) {
				assetSum += converted;
				assetTotals.set(row.displayGroup, (assetTotals.get(row.displayGroup) ?? 0) + converted);
			} else {
				liabilitySum += converted;
				liabilityTotals.set(
					row.displayGroup,
					(liabilityTotals.get(row.displayGroup) ?? 0) + converted,
				);
			}
		}

		const current = assetSum - liabilitySum;
		const { start, end } = rangeBounds(range);
		const snaps = await this.db
			.select()
			.from(accountBalanceSnapshot)
			.where(and(eq(accountBalanceSnapshot.userId, userId), lte(accountBalanceSnapshot.date, end)));

		const snapsByAccount = new Map<string, { date: string; balance: number }[]>();
		for (const snap of snaps) {
			const list = snapsByAccount.get(snap.bankAccountId) ?? [];
			list.push({ date: snap.date, balance: snap.balance });
			snapsByAccount.set(snap.bankAccountId, list);
		}
		for (const list of snapsByAccount.values()) {
			list.sort((a, b) => a.date.localeCompare(b.date));
		}

		const series: { date: string; value: number }[] = [];
		const firstByGroup = new Map<string, number>();
		for (const day of eachDay(start, end)) {
			let dayValue = 0;
			let any = false;
			const dayGroups = new Map<string, number>();
			for (const row of visible) {
				if (!this.fx.isFiat(row.isoCurrencyCode)) {
					continue;
				}
				const balance = lastOnOrBefore(snapsByAccount.get(row.id) ?? [], day);
				if (balance === null) {
					continue;
				}
				const converted = await this.fx.convert(balance, row.isoCurrencyCode, base, day);
				if (converted === null) {
					continue;
				}
				any = true;
				dayValue += row.isAsset ? converted : -converted;
				dayGroups.set(row.displayGroup, (dayGroups.get(row.displayGroup) ?? 0) + converted);
			}
			if (any) {
				series.push({ date: day, value: dayValue });
				if (firstByGroup.size === 0) {
					for (const [group, total] of dayGroups) {
						firstByGroup.set(group, total);
					}
				}
			}
		}

		const first = series[0]?.value ?? 0;
		const change = current - first;
		const changePercent = first === 0 ? 0 : change / Math.abs(first);
		const groups: GroupSummary[] = DISPLAY_GROUPS.map((group) => {
			const total = (assetTotals.get(group) ?? 0) + (liabilityTotals.get(group) ?? 0);
			const startTotal = firstByGroup.get(group) ?? 0;
			return { group, total, change: total - startTotal };
		});

		return {
			current,
			change,
			changePercent,
			baseCurrency: base,
			series,
			assets: groupedTotals(assetTotals),
			liabilities: groupedTotals(liabilityTotals),
			groups,
		};
	}

	private async baseCurrency(userId: string) {
		const [existing] = await this.db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		if (existing) {
			return existing.currency;
		}
		await this.db.insert(userSettings).values({ userId, currency: "USD" }).onConflictDoNothing();
		return "USD";
	}
}

function toDto(
	account: typeof bankAccount.$inferSelect,
	institutionName: string | null,
	institutionLogo: string | null,
	plaidItemStatus: string | null,
	errorCode: string | null,
	sparkline: { date: string; value: number }[],
): BankAccountDto {
	return {
		id: account.id,
		name: account.name,
		officialName: account.officialName,
		displayGroup: account.displayGroup as DisplayGroup,
		type: account.type,
		mask: account.mask,
		currentBalance: account.currentBalance,
		availableBalance: account.availableBalance,
		creditLimit: account.creditLimit,
		isAsset: account.isAsset,
		institutionName,
		institutionLogo,
		lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
		source: account.source as "plaid" | "manual",
		isoCurrencyCode: account.isoCurrencyCode,
		isHidden: account.isHidden,
		plaidItemId: account.plaidItemId,
		plaidItemStatus,
		errorCode,
		sparkline: sparkline.sort((a, b) => a.date.localeCompare(b.date)),
	};
}

function groupedTotals(totals: Map<string, number>) {
	return DISPLAY_GROUPS.filter((group) => totals.has(group)).map((group) => ({
		group,
		total: totals.get(group) ?? 0,
	}));
}

function today() {
	return new Date().toISOString().slice(0, 10);
}

function shiftDays(isoDate: string, days: number) {
	const date = new Date(`${isoDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function rangeBounds(range: NetWorthRange) {
	const end = today();
	if (range === "ytd") {
		return { start: `${end.slice(0, 4)}-01-01`, end };
	}
	const days = range === "1m" ? -29 : range === "3m" ? -89 : -364;
	return { start: shiftDays(end, days), end };
}

function eachDay(start: string, end: string) {
	const days: string[] = [];
	let cursor = start;
	while (cursor <= end) {
		days.push(cursor);
		cursor = shiftDays(cursor, 1);
	}
	return days;
}

function lastOnOrBefore(snaps: { date: string; balance: number }[], day: string) {
	let found: number | null = null;
	for (const snap of snaps) {
		if (snap.date > day) {
			break;
		}
		found = snap.balance;
	}
	return found;
}
