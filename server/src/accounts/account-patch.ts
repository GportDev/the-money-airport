import { BadRequestException } from "@nestjs/common";
import type { bankAccount } from "../db/schema/bank-account";
import type { PaymentRule } from "../debt/card-payment";
import { CARD_TERM_FIELDS } from "../liabilities/liabilities.types";

type Account = typeof bankAccount.$inferSelect;

export type AccountPatchInput = {
	name?: string;
	currentBalance?: number;
	creditLimit?: number | null;
	isHidden?: boolean;
	apyBps?: number | null;
	inCashPlan?: boolean;
	inDebtPlan?: boolean;
	debtPriority?: number | null;
	aprBps?: number | null;
	statementCloseDay?: number | null;
	paymentDueDay?: number | null;
	paymentRule?: PaymentRule;
	fixedPayment?: number | null;
};

/** Fields only a credit card has; APR also applies to loans. */
const CARD_ONLY = ["statementCloseDay", "paymentDueDay", "paymentRule", "fixedPayment"] as const;

/** Checks that each field fits the BankAccount's kind, then builds the update. */
export function accountPatch(existing: Account, input: AccountPatchInput): Partial<Account> {
	assertFits(existing, input);
	const set: Partial<Account> = { updatedAt: new Date() };
	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined) Object.assign(set, { [key]: value });
	}
	const overridden = CARD_TERM_FIELDS.filter(
		(field) => input[field] !== undefined && existing.displayGroup !== "cash",
	);
	if (overridden.length > 0) {
		set.overriddenFields = [...new Set([...existing.overriddenFields, ...overridden])];
	}
	return set;
}

function assertFits(existing: Account, input: AccountPatchInput) {
	const group = existing.displayGroup;
	const isLiability = group === "credit" || group === "loan";
	if (input.inCashPlan !== undefined && group !== "cash") {
		throw new BadRequestException("Only cash accounts can be in the cash plan");
	}
	if ((input.inDebtPlan !== undefined || input.debtPriority !== undefined) && !isLiability) {
		throw new BadRequestException("Only cards and loans can be in the debt plan");
	}
	if (input.aprBps !== undefined && !isLiability) {
		throw new BadRequestException("APR is for cards and loans");
	}
	if (CARD_ONLY.some((field) => input[field] !== undefined) && group !== "credit") {
		throw new BadRequestException("Card terms are for credit cards");
	}
}
