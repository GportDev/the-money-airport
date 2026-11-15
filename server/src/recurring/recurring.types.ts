export const CADENCES = ["weekly", "monthly", "yearly"] as const;
export type Cadence = (typeof CADENCES)[number];

/** A bill or subscription that could be tracked; detection returns these before they exist. */
export type RecurringCandidate = {
	merchantName: string;
	merchantLogoUrl: string | null;
	/** Absolute cents in `isoCurrencyCode`, an outflow. */
	amount: number;
	isoCurrencyCode: string;
	cadence: Cadence;
	nextDate: string;
	/** Negative once `nextDate` has passed. */
	daysUntil: number;
	categoryId: string | null;
	account: { id: string; name: string } | null;
};

export type RecurringListItem = RecurringCandidate & {
	id: string;
	lastPaidOn: string | null;
	isActive: boolean;
	isManual: boolean;
};

export type RecurringMonth = {
	month: string;
	baseCurrency: string;
	/** Base cents still due through the end of `month`, overdue included. */
	remainingDue: number;
	/** Base cents marked paid during `month`. */
	paid: number;
	/** Active items by next date, then inactive ones. */
	items: RecurringListItem[];
};

export type CreateRecurringInput = {
	merchantName: string;
	amount: number;
	cadence: Cadence;
	nextDate: string;
	bankAccountId?: string | null;
	categoryId?: string | null;
	isActive?: boolean;
	/** False when the User confirms a detected candidate. */
	isManual?: boolean;
};

export type UpdateRecurringInput = {
	amount?: number;
	cadence?: Cadence;
	nextDate?: string;
	isActive?: boolean;
};
