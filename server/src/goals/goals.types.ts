export const GOAL_TYPES = ["save_up", "pay_down"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_FUNDING = ["accounts", "fund"] as const;
export type GoalFunding = (typeof GOAL_FUNDING)[number];

export const FUND_ENTRY_KINDS = ["deposit", "withdrawal", "interest"] as const;
export type FundEntryKind = (typeof FUND_ENTRY_KINDS)[number];

export type GoalStatus = "on_track" | "at_risk";

export type GoalAccountDto = {
	id: string;
	name: string;
	mask: string | null;
	currentBalance: number;
	isoCurrencyCode: string;
};

export type FundSummary = { goalId: string; name: string; balance: number };

export type FundHostDto = {
	id: string;
	name: string;
	isoCurrencyCode: string;
	balance: number;
	unassigned: number;
	funds: FundSummary[];
};

export type GoalDto = {
	id: string;
	name: string;
	type: GoalType;
	funding: GoalFunding;
	icon: string;
	color: string;
	thumbnailUrl: string | null;
	/** Base currency cents. */
	targetAmount: number;
	/** Base currency cents: saved so far, or still owed for pay-down. */
	currentAmount: number;
	targetDate: string | null;
	sortOrder: number;
	status: GoalStatus;
	percentComplete: number;
	accounts: GoalAccountDto[];
	host: { id: string; name: string; isoCurrencyCode: string; unassigned: number } | null;
	/** Native host cents; null unless funding is fund. */
	fundBalance: number | null;
	/** Filled by the Debt plan (Phase 10); null until then. */
	payoffMonth: string | null;
};

export type GoalsList = {
	totalCurrent: number;
	baseCurrency: string;
	goals: GoalDto[];
	hosts: FundHostDto[];
};

export type FundEntryDto = {
	id: string;
	date: string;
	amount: number;
	kind: FundEntryKind;
	transactionId: string | null;
	note: string | null;
	balanceAfter: number;
};

export type CreateGoalInput = {
	name: string;
	type: GoalType;
	targetAmount: number;
	targetDate?: string | null;
	icon?: string;
	color?: string;
	funding?: GoalFunding;
	hostBankAccountId?: string;
};

export type UpdateGoalInput = {
	name?: string;
	targetAmount?: number;
	targetDate?: string | null;
	icon?: string;
	color?: string;
	sortOrder?: number;
};

export type CreateFundEntryInput =
	| { transactionId: string; note?: string | null }
	| { date: string; amount: number; kind: FundEntryKind; note?: string | null };
