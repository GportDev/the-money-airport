import type { PlanItemKind, SectionType } from "./projection";

export type OneOffStatus = "expected" | "done" | "cancelled";

export type OneOffDto = {
	id: string;
	sectionId: string;
	name: string;
	date: string;
	/** Base cents, signed: + inflow, − outflow. */
	amount: number;
	bankAccountId: string | null;
	categoryId: string | null;
	goalId: string | null;
	status: OneOffStatus;
	matchedTransactionId: string | null;
};

export type ForecastSectionDto = {
	id: string;
	name: string;
	type: SectionType;
	sortOrder: number;
};

export type ForecastRowDto = {
	id: string;
	sectionId: string;
	name: string;
	dayOfMonth: number | null;
	categoryId: string | null;
	bankAccountId: string | null;
	goalId: string | null;
	sortOrder: number;
};

export type ForecastRowFull = ForecastRowDto & {
	typicalMonthly: number;
	/** Twelve Plan amounts, January first. */
	sparkline: number[];
	/** Month (1-12) → Plan and, for past months with a Category, the Actual. */
	cells: Record<number, { plan: number; actual: number | null }>;
};

export type ForecastSectionFull = ForecastSectionDto & {
	rows: ForecastRowFull[];
	oneOffs: OneOffDto[];
	/** Month (1-12) → sum of Plan amounts. */
	totals: Record<number, number>;
};

export type ForecastSummary = {
	baseCurrency: string;
	safetyBuffer: number;
	cashFlow: Record<number, number>;
	/** Month-end; past months from snapshots, the rest projected. */
	operatingCash: Record<number, number>;
	lowPoint: Record<number, { date: string; value: number }>;
	shortfalls: { date: string; short: number }[];
	creditCardTotal: Record<number, number>;
	savingsTotal: Record<number, number>;
	fixedExpensesTotal: Record<number, number>;
	variableExpensesTotal: Record<number, number>;
	debtPaymentsTotal: Record<number, number>;
	paybackTotal: Record<number, number>;
	debtTotal: Record<number, number>;
	projectedBalanceSeries: { month: number; value: number; projected: boolean }[];
};

export type ForecastMonthItem = {
	kind: PlanItemKind;
	name: string;
	amount: number;
	sourceId: string | null;
};

export type ForecastMonth = {
	baseCurrency: string;
	safetyBuffer: number;
	openingBalance: number;
	closingBalance: number;
	series: { date: string; value: number; projected: boolean }[];
	lowPoint: { date: string; value: number };
	shortfalls: { date: string; short: number }[];
	days: { date: string; net: number; balanceAfter: number; items: ForecastMonthItem[] }[];
};

export type RowInput = {
	sectionId: string;
	name: string;
	dayOfMonth?: number | null;
	categoryId?: string | null;
	bankAccountId?: string | null;
	goalId?: string | null;
};

export type RowPatch = Partial<Omit<RowInput, "sectionId">> & {
	sortOrder?: number;
};

export type OneOffInput = {
	sectionId: string;
	name: string;
	date: string;
	amount: number;
	bankAccountId?: string | null;
	categoryId?: string | null;
	goalId?: string | null;
};

export type OneOffPatch = Partial<Omit<OneOffInput, "sectionId">> & {
	status?: OneOffStatus;
};
