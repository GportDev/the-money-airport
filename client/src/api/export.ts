import { downloadFile } from "@/api/client";

export function downloadTransactionsCsv() {
	return downloadFile("/export/transactions?format=csv", "transactions.csv");
}

export function downloadAccountsCsv() {
	return downloadFile("/export/accounts?format=csv", "accounts.csv");
}
