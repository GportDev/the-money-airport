import { BadRequestException } from "@nestjs/common";
import type { ParsedStatement, StatementLine } from "./statement-import.types";

export const NOT_OFX_MESSAGE = "This file isn't an OFX/QFX statement";
export const NO_LINES_MESSAGE = "This statement has no transactions";

const ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&apos;": "'",
	"&quot;": '"',
	"&nbsp;": " ",
};
const ENTITY = /&(amp|lt|gt|apos|quot|nbsp);/g;
const MASK_LENGTH = 4;

/**
 * Reads a credit card statement from OFX 1.x (SGML, as in QFX and QBO) or OFX 2.x (XML).
 * SGML leaves leaf tags unclosed, so every value is read as the text after its opening tag.
 */
export function parseOfx(text: string): ParsedStatement {
	const body = ofxBody(text);
	const list = block(body, "BANKTRANLIST");
	if (!list) throw new BadRequestException(NOT_OFX_MESSAGE);
	const lines = blocks(list, "STMTTRN").flatMap((entry) => {
		const line = statementLine(entry);
		return line ? [line] : [];
	});
	if (lines.length === 0) throw new BadRequestException(NO_LINES_MESSAGE);
	const ledger = block(body, "LEDGERBAL");
	const balance = ledger ? cents(value(ledger, "BALAMT")) : null;
	const accountId = value(block(body, "CCACCTFROM") ?? body, "ACCTID");
	return {
		periodStart: isoDate(value(list, "DTSTART")) ?? earliest(lines),
		periodEnd: isoDate(value(list, "DTEND")) ?? latest(lines),
		// Issuers differ on the sign of what is owed; a card's Statement balance is never below 0.
		statementBalance: balance === null ? null : Math.abs(balance),
		minimumPayment: null,
		dueDate: null,
		accountMask: accountId ? accountId.slice(-MASK_LENGTH) : null,
		currency: value(body, "CURDEF")?.toUpperCase() ?? null,
		lines,
	};
}

function ofxBody(text: string) {
	const start = text.search(/<OFX>/i);
	if (start < 0) throw new BadRequestException(NOT_OFX_MESSAGE);
	return text.slice(start);
}

function statementLine(entry: string): StatementLine | null {
	const fitId = value(entry, "FITID");
	const date = isoDate(value(entry, "DTPOSTED"));
	const amount = cents(value(entry, "TRNAMT"));
	if (!fitId || !date || amount === null) return null;
	const name = value(entry, "NAME") ?? value(entry, "MEMO") ?? value(entry, "PAYEE") ?? fitId;
	return { fitId, date, amount: signed(amount, value(entry, "TRNTYPE")), name };
}

/** Charges are negative here; an issuer that writes charges as positive DEBITs is flipped. */
function signed(amount: number, type: string | null) {
	const kind = type?.toUpperCase();
	if (kind === "DEBIT") return -Math.abs(amount);
	if (kind === "CREDIT") return Math.abs(amount);
	return amount;
}

function block(text: string, tag: string) {
	return blocks(text, tag)[0] ?? null;
}

/** The text inside each `<TAG>…</TAG>`; an unclosed one runs to the next opening of the same tag. */
function blocks(text: string, tag: string) {
	const pattern = new RegExp(`<${tag}>([\\s\\S]*?)(?=</${tag}>|<${tag}>|$)`, "gi");
	return [...text.matchAll(pattern)].map((match) => match[1] ?? "");
}

function value(text: string, tag: string) {
	const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(text);
	const raw = match?.[1]?.trim();
	return raw ? raw.replace(ENTITY, (entity) => ENTITIES[entity] ?? entity) : null;
}

/** OFX dates start YYYYMMDD; the time and zone after them are dropped. */
function isoDate(raw: string | null) {
	const match = raw ? /^(\d{4})(\d{2})(\d{2})/.exec(raw) : null;
	return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** "-1,234.56", "1234,56", and "12" in cents, without floating-point rounding. */
function cents(raw: string | null) {
	if (!raw) return null;
	const normalized = raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(",", ".");
	const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(normalized);
	if (!match || (match[2] === "" && !match[3])) return null;
	const whole = Number(match[2] || "0");
	const fraction = Number(`${match[3] ?? ""}00`.slice(0, 2));
	const total = whole * 100 + fraction;
	return match[1] === "-" ? -total : total;
}

function earliest(lines: StatementLine[]) {
	return lines.reduce((min, line) => (line.date < min ? line.date : min), lines[0]?.date ?? "");
}

function latest(lines: StatementLine[]) {
	return lines.reduce((max, line) => (line.date > max ? line.date : max), lines[0]?.date ?? "");
}
