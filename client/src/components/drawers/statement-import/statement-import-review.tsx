import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
	type StatementDraft,
	StatementFieldsForm,
} from "@/components/drawers/statement-import/statement-fields-form";
import { StatementLineList } from "@/components/drawers/statement-import/statement-line-list";
import { StatementLineRow } from "@/components/drawers/statement-import/statement-line-row";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { useCommitStatementImport } from "@/hooks/use-statement-import";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import type { StatementFields, StatementImportPreview, StatementImportResult } from "@/types";

type Props = {
	accountId: string;
	file: string;
	preview: StatementImportPreview;
	currency: string;
	onDone: () => void;
};

/** The preview of one Statement file: its fields, the pairs, and the Import button. */
export function StatementImportReview({ accountId, file, preview, currency, onDone }: Props) {
	const commit = useCommitStatementImport();
	const [draft, setDraft] = useState(() => draftOf(preview.statement));
	const [unmatched, setUnmatched] = useState<ReadonlySet<string>>(new Set());
	const matched = preview.matched.filter((pair) => !unmatched.has(pair.line.fitId));
	const unpaired = preview.matched.filter((pair) => unmatched.has(pair.line.fitId));
	const newLines = [...preview.newLines, ...unpaired.map((pair) => pair.line)];
	const notOnStatement = [...preview.notOnStatement, ...unpaired.map((pair) => pair.transaction)];
	const isBalanceMissing = draft.statementBalance.trim() === "";

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		try {
			const result = await commit.mutateAsync({
				accountId,
				file,
				statement: statementOf(draft),
				unmatchedFitIds: [...unmatched],
			});
			toast.success(resultMessage(result));
			onDone();
		} catch (error) {
			toast.error(
				error instanceof ApiError && error.apiMessage
					? error.apiMessage
					: "Could not import the statement",
			);
		}
	}

	return (
		<form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={onSubmit}>
			<div className="flex flex-col gap-4 px-4">
				{preview.isMaskMismatch ? (
					<output className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
						This file is for a card number that doesn't match this card.
					</output>
				) : null}
				<StatementFieldsForm draft={draft} onChange={setDraft} />
				{preview.alreadyImported.length > 0 ? (
					<p className="text-sm text-muted-foreground">
						{preview.alreadyImported.length} already imported, skipped.
					</p>
				) : null}
				<StatementLineList
					title="Matched"
					hint="Your entries the statement confirms. The bank's amount and date win."
					count={matched.length}
				>
					{matched.map(({ line, transaction }) => (
						<li key={line.fitId} className="flex items-center gap-2 px-3 py-1.5">
							<div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
								<StatementLineRow {...rowOf(transaction)} currency={currency} />
								<StatementLineRow {...rowOf(line)} currency={currency} />
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setUnmatched(new Set([...unmatched, line.fitId]))}
							>
								Unmatch
							</Button>
						</li>
					))}
				</StatementLineList>
				<StatementLineList
					title="New"
					hint="Lines with no entry; they get added."
					count={newLines.length}
				>
					{newLines.map((line) => (
						<li key={line.fitId} className="px-3 py-1.5">
							<StatementLineRow {...rowOf(line)} currency={currency} />
						</li>
					))}
				</StatementLineList>
				<StatementLineList
					title="Not on statement"
					hint="Your entries in this period that no line matched. They stay, with a badge."
					count={notOnStatement.length}
				>
					{notOnStatement.map((row) => (
						<li key={row.id} className="px-3 py-1.5">
							<StatementLineRow {...rowOf(row)} currency={currency} />
						</li>
					))}
				</StatementLineList>
			</div>
			<SheetFooter>
				{isBalanceMissing ? (
					<p className="text-xs text-muted-foreground">Enter the statement balance to import.</p>
				) : null}
				<Button type="submit" disabled={isBalanceMissing || commit.isPending}>
					{commit.isPending ? "Importing…" : "Import"}
				</Button>
			</SheetFooter>
		</form>
	);
}

function rowOf(item: { date: string; name: string; amount: number }) {
	return { date: item.date, name: item.name, amount: item.amount };
}

function draftOf(statement: StatementFields): StatementDraft {
	return {
		periodStart: statement.periodStart,
		periodEnd: statement.periodEnd,
		statementBalance:
			statement.statementBalance === null ? "" : centsToMajorUnits(statement.statementBalance),
		minimumPayment:
			statement.minimumPayment === null ? "" : centsToMajorUnits(statement.minimumPayment),
		dueDate: statement.dueDate ?? "",
	};
}

function statementOf(draft: StatementDraft) {
	const minimum = draft.minimumPayment.trim();
	return {
		periodStart: draft.periodStart,
		periodEnd: draft.periodEnd,
		statementBalance: majorUnitsToCents(draft.statementBalance),
		minimumPayment: minimum === "" ? null : majorUnitsToCents(minimum),
		dueDate: draft.dueDate || null,
	};
}

function resultMessage(result: StatementImportResult) {
	const base = `Imported ${result.added} new, confirmed ${result.confirmed}`;
	return result.notOnStatement > 0 ? `${base}, ${result.notOnStatement} not on statement` : base;
}
