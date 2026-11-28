import { addDays } from "../forecast/dates";
import type { StatementLine } from "./statement-import.types";

/** A hand-entered line may post this many days before or after the User's date. */
export const MATCH_WINDOW_DAYS = 3;

/** A hand-entered row, with a split's parts summed into `amount`. */
export type HandEnteredRow = {
	id: string;
	date: string;
	amount: number;
	name: string;
	merchantName: string | null;
	/** false once the User chose Keep on an earlier import. */
	notOnStatement: boolean | null;
};

export type Reconciliation = {
	matched: { line: StatementLine; row: HandEnteredRow }[];
	newLines: StatementLine[];
	notOnStatement: HandEnteredRow[];
};

type Candidate = { line: StatementLine; row: HandEnteredRow; gap: number; similarity: number };

/**
 * Pairs each statement line with one hand-entered row of the same amount within the match
 * window: closest date first, then the most similar name. Rows paired with a line in
 * `unmatchedFitIds` are left unpaired on both sides, as the User asked in the preview.
 */
export function reconcile(
	lines: StatementLine[],
	rows: HandEnteredRow[],
	period: { periodStart: string; periodEnd: string },
	unmatchedFitIds: ReadonlySet<string> = new Set(),
): Reconciliation {
	const pairs = bestPairs(lines, rows);
	const matched = pairs.filter((pair) => !unmatchedFitIds.has(pair.line.fitId));
	const pairedFitIds = new Set(matched.map((pair) => pair.line.fitId));
	const pairedRowIds = new Set(pairs.map((pair) => pair.row.id));
	const unpairedByUser = new Set(
		pairs.filter((pair) => unmatchedFitIds.has(pair.line.fitId)).map((pair) => pair.row.id),
	);
	// Later rows may still post next period, so they stay unflagged.
	const lastFlaggedDate = addDays(period.periodEnd, -MATCH_WINDOW_DAYS);
	const notOnStatement = rows.filter((row) => {
		if (unpairedByUser.has(row.id)) return true;
		if (pairedRowIds.has(row.id) || row.notOnStatement === false) return false;
		return row.date >= period.periodStart && row.date <= lastFlaggedDate;
	});
	return {
		matched: matched.map(({ line, row }) => ({ line, row })),
		newLines: lines.filter((line) => !pairedFitIds.has(line.fitId)),
		notOnStatement,
	};
}

function bestPairs(lines: StatementLine[], rows: HandEnteredRow[]) {
	const candidates: Candidate[] = [];
	for (const line of lines) {
		for (const row of rows) {
			const gap = Math.abs(dayDiff(line.date, row.date));
			if (row.amount !== line.amount || gap > MATCH_WINDOW_DAYS) continue;
			candidates.push({ line, row, gap, similarity: nameSimilarity(line.name, row) });
		}
	}
	candidates.sort((a, b) => a.gap - b.gap || b.similarity - a.similarity);
	const usedLines = new Set<string>();
	const usedRows = new Set<string>();
	const pairs: Candidate[] = [];
	for (const candidate of candidates) {
		if (usedLines.has(candidate.line.fitId) || usedRows.has(candidate.row.id)) continue;
		usedLines.add(candidate.line.fitId);
		usedRows.add(candidate.row.id);
		pairs.push(candidate);
	}
	return pairs.sort((a, b) => a.line.date.localeCompare(b.line.date));
}

/** Share of words the line and the row's name or merchant have in common, 0 to 1. */
function nameSimilarity(lineName: string, row: HandEnteredRow) {
	const lineWords = words(lineName);
	const rowWords = words(`${row.name} ${row.merchantName ?? ""}`);
	if (lineWords.size === 0 || rowWords.size === 0) return 0;
	const shared = [...lineWords].filter((word) => rowWords.has(word)).length;
	return shared / new Set([...lineWords, ...rowWords]).size;
}

function words(text: string) {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((word) => word.length > 1),
	);
}

function dayDiff(a: string, b: string) {
	return (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}
