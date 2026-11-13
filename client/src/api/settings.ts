import { api } from "@/api/client";
import type { DashboardWidget, DebtStrategy, UserSettings } from "@/types";

export function getSettings() {
	return api<UserSettings>("/settings");
}

export type SettingsPatch = {
	currency?: string;
	dashboardWidgets?: DashboardWidget[];
	budgetCopyForward?: boolean;
	safetyBuffer?: number;
	paybackDay?: number | null;
	debtStrategy?: DebtStrategy;
};

export function updateSettings(body: SettingsPatch) {
	return api<UserSettings>("/settings", { method: "PATCH", body: JSON.stringify(body) });
}
