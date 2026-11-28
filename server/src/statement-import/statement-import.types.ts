import type { CardStatementDto } from "../liabilities/liabilities.types";
import type { TransactionListItem } from "../transactions/transactions.types";

/** One Transaction line of a Statement file. Native cents, charges negative. */
export type StatementLine = {
	fitId: string;
	date: string;
	amount: number;
	name: string;
};

export type StatementFields = {
	periodStart: string;
	periodEnd: string;
	/** Native cents owed at the close; null when the file has no ledger balance. */
	statementBalance: number | null;
	minimumPayment: number | null;
	dueDate: string | null;
};

export type ParsedStatement = StatementFields & {
	/** Last 4 characters of the file's account number. */
	accountMask: string | null;
	currency: string | null;
	lines: StatementLine[];
};

export type StatementImportPreview = {
	statement: StatementFields;
	/** True when the card has a mask and the file's account number ends differently. */
	isMaskMismatch: boolean;
	matched: { line: StatementLine; transaction: TransactionListItem }[];
	newLines: StatementLine[];
	notOnStatement: TransactionListItem[];
	alreadyImported: StatementLine[];
};

export type StatementImportInput = {
	file: string;
	statement: StatementFields & { statementBalance: number };
	/** Lines the User unmatched in the preview; they are added as new. */
	unmatchedFitIds: string[];
};

export type StatementImportResult = {
	added: number;
	confirmed: number;
	notOnStatement: number;
	statement: CardStatementDto;
};
