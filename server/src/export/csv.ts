export type CsvCell = string | number | boolean | null;

const NEEDS_QUOTES = /[",\r\n]/;
// Spreadsheets run a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

/** Text from users or banks; a leading quote stops a spreadsheet from running it as a formula. */
export function textCell(value: string | null) {
	if (!value) return "";
	return FORMULA_START.test(value) ? `'${value}` : value;
}

export function centsCell(cents: number) {
	return (cents / 100).toFixed(2);
}

function escapeCell(cell: CsvCell) {
	const value = cell === null ? "" : String(cell);
	return NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: CsvCell[][]) {
	return `${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}\r\n`;
}
