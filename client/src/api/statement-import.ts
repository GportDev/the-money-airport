import { api } from "@/api/client";
import type { StatementFields, StatementImportPreview, StatementImportResult } from "@/types";

export type StatementImportInput = {
	accountId: string;
	file: string;
	statement: StatementFields & { statementBalance: number };
	unmatchedFitIds: string[];
};

export function previewStatementImport({ accountId, file }: { accountId: string; file: string }) {
	return api<StatementImportPreview>(`/accounts/${accountId}/statement-import/preview`, {
		method: "POST",
		body: JSON.stringify({ file }),
	});
}

export function commitStatementImport({ accountId, ...body }: StatementImportInput) {
	return api<StatementImportResult>(`/accounts/${accountId}/statement-import`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/** Keep: clears the Not on statement badge. */
export function keepTransaction(id: string) {
	return api<{ success: boolean }>(`/transactions/${id}/not-on-statement`, { method: "DELETE" });
}
