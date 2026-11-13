export type PaymentRule = "statement_balance" | "new_charges" | "minimum" | "fixed";

/**
 * Projected minimum for a Statement Plaid has not issued yet: 1% of the balance plus the period's
 * interest, at least $25, never more than the balance (a common US issuer formula).
 */
const MINIMUM_FLOOR = 2_500;
const MINIMUM_PRINCIPAL_RATE = 0.01;

export function projectedMinimum(statementBalance: number, interest: number) {
	const formula = Math.round(statementBalance * MINIMUM_PRINCIPAL_RATE) + interest;
	return Math.min(statementBalance, Math.max(MINIMUM_FLOOR, formula));
}

/** CONTEXT Payment rule: what the plan pays on a Statement's due date, before any Payback. */
export function cardPayment(input: {
	rule: PaymentRule;
	statementBalance: number;
	minimum: number;
	periodSpend: number;
	fixedPayment: number | null;
}) {
	const statement = Math.max(0, input.statementBalance);
	const minimum = Math.min(statement, input.minimum);
	switch (input.rule) {
		case "minimum":
			return minimum;
		case "new_charges":
			return Math.min(statement, Math.max(minimum, input.periodSpend));
		case "fixed":
			return Math.min(statement, Math.max(minimum, input.fixedPayment ?? 0));
		default:
			return statement;
	}
}
