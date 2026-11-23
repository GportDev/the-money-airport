import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import type { SplitPartInput, TransactionDetail } from "@/types";

/** One editable part. `amount` is a positive major-unit string; the total's sign applies. */
export type SplitDraft = { key: string; categoryId: string | null; amount: string };

export const MIN_SPLIT_PARTS = 2;

export function newSplitDraft(categoryId: string | null = null, cents = 0): SplitDraft {
	return {
		key: crypto.randomUUID(),
		categoryId,
		amount: cents === 0 ? "" : centsToMajorUnits(Math.abs(cents)),
	};
}

/** The saved parts, or the whole Transaction plus one empty part to fill in. */
export function initialSplitDrafts(transaction: TransactionDetail): SplitDraft[] {
	if (transaction.split) {
		return transaction.split.parts.map((part) =>
			newSplitDraft(part.category?.id ?? null, part.amount),
		);
	}
	return [newSplitDraft(transaction.category?.id ?? null, transaction.amount), newSplitDraft()];
}

export function draftCents(draft: SplitDraft) {
	const cents = majorUnitsToCents(draft.amount);
	return Number.isFinite(cents) && cents > 0 ? cents : 0;
}

/** Cents still to assign; negative when the parts go over the total. */
export function remainingCents(total: number, drafts: SplitDraft[]) {
	return Math.abs(total) - drafts.reduce((sum, draft) => sum + draftCents(draft), 0);
}

export function isSplitComplete(total: number, drafts: SplitDraft[]) {
	return (
		drafts.length >= MIN_SPLIT_PARTS &&
		drafts.every((draft) => draft.categoryId !== null && draftCents(draft) > 0) &&
		remainingCents(total, drafts) === 0
	);
}

export function toSplitParts(total: number, drafts: SplitDraft[]): SplitPartInput[] {
	const sign = Math.sign(total);
	return drafts.map((draft) => ({
		categoryId: draft.categoryId ?? "",
		amount: sign * draftCents(draft),
	}));
}
