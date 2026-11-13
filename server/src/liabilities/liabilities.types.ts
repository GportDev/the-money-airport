import type { PaymentRule } from "../debt/card-payment";
import type { TransactionListItem } from "../transactions/transactions.types";

export type CardStatementDto = {
	id: string;
	periodStart: string;
	periodEnd: string;
	statementBalance: number;
	minimumPayment: number | null;
	dueDate: string | null;
	source: "plaid" | "manual";
};

export type CardSummary = {
	statementCloseDay: number | null;
	paymentDueDay: number | null;
	paymentRule: PaymentRule;
	fixedPayment: number | null;
	latestStatement: CardStatementDto | null;
	/** Native cents charged since the latest close. */
	currentPeriodSpend: number;
	/** Native cents the unpaid Statement balance adds next period. */
	projectedInterest: number;
	utilization: number | null;
	overriddenFields: string[];
};

export type LoanTermsDto = {
	principal: number | null;
	termMonths: number | null;
	firstPaymentDate: string | null;
	paymentDay: number | null;
	/** Stored, or computed from principal, APR, and term; null for a balance-only loan. */
	scheduledPayment: number | null;
	extraPayment: number;
	source: "plaid" | "manual";
};

export type StatementPeriod = {
	/** null = the current open period. */
	statement: CardStatementDto | null;
	periodStart: string;
	periodEnd: string;
	total: number;
	previousPeriodEnd: string | null;
	/** "open" points at the current open period. */
	nextPeriodEnd: string | null;
	transactions: TransactionListItem[];
};

export type ManualStatementInput = {
	periodStart: string;
	periodEnd: string;
	statementBalance: number;
	minimumPayment?: number | null;
	dueDate?: string | null;
};

export type LoanTermsInput = {
	principal?: number | null;
	termMonths?: number | null;
	firstPaymentDate?: string | null;
	paymentDay?: number | null;
	scheduledPayment?: number | null;
	extraPayment?: number;
};

/** Card-term fields a User override protects from Plaid Liabilities sync. */
export const CARD_TERM_FIELDS = [
	"aprBps",
	"creditLimit",
	"statementCloseDay",
	"paymentDueDay",
	"paymentRule",
	"fixedPayment",
] as const;

export type CardTermField = (typeof CARD_TERM_FIELDS)[number];
