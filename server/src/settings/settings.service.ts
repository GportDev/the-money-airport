import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE } from "../db/db.module";
import { userSettings } from "../db/schema/user-settings";
import { type DashboardWidget, normalizeWidgets } from "./dashboard-widgets";

export type DebtStrategy = "avalanche" | "snowball" | "custom";

export type UserSettingsDto = {
	currency: string;
	dashboardWidgets: DashboardWidget[];
	budgetCopyForward: boolean;
	safetyBuffer: number;
	paybackDay: number | null;
	debtStrategy: DebtStrategy;
};

export type UserSettingsPatch = {
	currency?: string;
	dashboardWidgets?: { id: string; visible: boolean; order: number }[];
	budgetCopyForward?: boolean;
	safetyBuffer?: number;
	paybackDay?: number | null;
	debtStrategy?: DebtStrategy;
};

@Injectable()
export class SettingsService {
	constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

	async get(userId: string): Promise<UserSettingsDto> {
		const row = await this.row(userId);
		return {
			currency: row.currency,
			dashboardWidgets: normalizeWidgets(row.dashboardWidgets),
			budgetCopyForward: row.budgetCopyForward,
			safetyBuffer: row.safetyBuffer,
			paybackDay: row.paybackDay,
			// Narrowed on write by the controller's enum.
			debtStrategy: row.debtStrategy as DebtStrategy,
		};
	}

	async update(userId: string, patch: UserSettingsPatch): Promise<UserSettingsDto> {
		await this.row(userId);
		await this.db
			.update(userSettings)
			.set({
				...(patch.currency ? { currency: patch.currency } : {}),
				...(patch.dashboardWidgets
					? { dashboardWidgets: normalizeWidgets(patch.dashboardWidgets) }
					: {}),
				...(patch.budgetCopyForward === undefined
					? {}
					: { budgetCopyForward: patch.budgetCopyForward }),
				...(patch.safetyBuffer === undefined ? {} : { safetyBuffer: patch.safetyBuffer }),
				...(patch.paybackDay === undefined ? {} : { paybackDay: patch.paybackDay }),
				...(patch.debtStrategy ? { debtStrategy: patch.debtStrategy } : {}),
				updatedAt: new Date(),
			})
			.where(eq(userSettings.userId, userId));
		return this.get(userId);
	}

	private async row(userId: string) {
		const [existing] = await this.db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		if (existing) {
			return existing;
		}
		await this.db.insert(userSettings).values({ userId }).onConflictDoNothing();
		const [created] = await this.db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		if (!created) {
			throw new Error("Could not create user settings");
		}
		return created;
	}
}
