import type { CreditCardLiability, LiabilitiesObject, MortgageLiability, StudentLoan } from "plaid";
import type { PlaidCardLiability, PlaidLiabilities, PlaidLoanLiability } from "./plaid.port";

/** Plaid answers these when an Item has no liability accounts; that is not a failure. */
export const NO_LIABILITIES = new Set(["PRODUCTS_NOT_SUPPORTED", "NO_LIABILITY_ACCOUNTS"]);

const MONTHS_PER_YEAR = 12;

function toCents(dollars: number | null | undefined) {
	return dollars === null || dollars === undefined ? null : Math.round(dollars * 100);
}

function toBps(percentage: number | null | undefined) {
	return percentage === null || percentage === undefined ? null : Math.round(percentage * 100);
}

/** "30 year" or "360 month" → months. */
function termMonths(loanTerm: string | null) {
	const match = loanTerm ? /(\d+)\s*(year|month)/i.exec(loanTerm) : null;
	if (!match) return null;
	const count = Number(match[1]);
	return match[2]?.toLowerCase() === "year" ? count * MONTHS_PER_YEAR : count;
}

function mapCard(card: CreditCardLiability): PlaidCardLiability | null {
	if (!card.account_id) return null;
	const purchase = card.aprs.find((apr) => apr.apr_type === "purchase_apr") ?? card.aprs[0];
	return {
		plaidAccountId: card.account_id,
		aprBps: toBps(purchase?.apr_percentage),
		lastStatementBalance: toCents(card.last_statement_balance),
		minimumPayment: toCents(card.minimum_payment_amount),
		lastStatementIssueDate: card.last_statement_issue_date,
		nextPaymentDueDate: card.next_payment_due_date,
	};
}

function mapStudentLoan(loan: StudentLoan): PlaidLoanLiability | null {
	if (!loan.account_id) return null;
	return {
		plaidAccountId: loan.account_id,
		aprBps: toBps(loan.interest_rate_percentage),
		principal: toCents(loan.origination_principal_amount),
		termMonths: null,
		firstPaymentDate: null,
		nextPaymentDueDate: loan.next_payment_due_date,
		scheduledPayment: toCents(loan.minimum_payment_amount),
	};
}

function mapMortgage(mortgage: MortgageLiability): PlaidLoanLiability {
	return {
		plaidAccountId: mortgage.account_id,
		aprBps: toBps(mortgage.interest_rate.percentage),
		principal: toCents(mortgage.origination_principal_amount),
		termMonths: termMonths(mortgage.loan_term),
		firstPaymentDate: null,
		nextPaymentDueDate: mortgage.next_payment_due_date,
		scheduledPayment: toCents(mortgage.next_monthly_payment),
	};
}

export function mapLiabilities(liabilities: LiabilitiesObject): PlaidLiabilities {
	const loans = [
		...(liabilities.student ?? []).map(mapStudentLoan),
		...(liabilities.mortgage ?? []).map(mapMortgage),
	];
	return {
		cards: (liabilities.credit ?? []).flatMap((card) => mapCard(card) ?? []),
		loans: loans.flatMap((loan) => loan ?? []),
	};
}
