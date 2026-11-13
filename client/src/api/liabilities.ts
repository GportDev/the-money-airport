import { api } from "@/api/client";
import type { Amortization, CardStatement, LoanTerms, StatementPeriod } from "@/types";

export type ManualStatementInput = {
	periodStart: string;
	periodEnd: string;
	statementBalance: number;
	minimumPayment: number | null;
	dueDate: string | null;
};

export type LoanTermsInput = Partial<Omit<LoanTerms, "source">>;

/** `periodEnd` picks a Statement, "open" the current period, nothing the latest. */
export function getStatementPeriod(accountId: string, periodEnd?: string) {
	const query = periodEnd ? `?periodEnd=${periodEnd}` : "";
	return api<StatementPeriod>(`/accounts/${accountId}/statements${query}`);
}

export function createStatement({
	accountId,
	...body
}: ManualStatementInput & { accountId: string }) {
	return api<CardStatement>(`/accounts/${accountId}/statements`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function setLoanTerms({ accountId, ...body }: LoanTermsInput & { accountId: string }) {
	return api<LoanTerms>(`/accounts/${accountId}/loan-terms`, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function getAmortization(accountId: string, extra?: number) {
	const query = extra === undefined ? "" : `?extra=${extra}`;
	return api<Amortization>(`/accounts/${accountId}/amortization${query}`);
}
