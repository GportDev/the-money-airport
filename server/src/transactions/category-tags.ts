import { inArray, type SQL, sql } from "drizzle-orm";
import type { CategoryDto } from "../categories/categories.service";
import { SAVINGS_TRANSFER } from "../categories/category-defaults";
import { transaction } from "../db/schema/transaction";

type CategoryLookup = { byId: Map<string, CategoryDto>; byName: Map<string, CategoryDto> };

function savingsIdOf(lookup: CategoryLookup) {
	return lookup.byName.get(SAVINGS_TRANSFER.toLowerCase())?.id;
}

/** One transfer tag at most; Savings Transfer rows carry `savings_transfer`. */
export function normalizeTags(tags: string[], isSavingsCategory: boolean): string[] {
	const isTransfer = tags.includes("transfer") || tags.includes("savings_transfer");
	if (!isTransfer) {
		return [];
	}
	return [isSavingsCategory ? "savings_transfer" : "transfer"];
}

/**
 * Tags after the User moves a Transaction from one Category to another. A transfer Category
 * makes it a Transfer; moving out of one makes it a plain Transaction again.
 */
export function tagsAfterRecategorize(
	lookup: CategoryLookup,
	previousId: string,
	targetId: string,
	tags: string[],
): string[] {
	const target = lookup.byId.get(targetId);
	const previous = lookup.byId.get(previousId);
	let next = tags;
	if (target?.kind === "transfer") {
		next = ["transfer"];
	} else if (previous?.kind === "transfer" && previousId !== targetId) {
		next = [];
	}
	return normalizeTags(next, targetId === savingsIdOf(lookup));
}

/** `tagsAfterRecategorize` as SQL, for updates where each row has its own previous Category. */
export function tagsAfterRecategorizeSql(lookup: CategoryLookup, targetId: string): SQL {
	if (lookup.byId.get(targetId)?.kind === "transfer") {
		return sql`array['transfer']::text[]`;
	}
	const swapped =
		targetId === savingsIdOf(lookup)
			? sql`case when 'transfer' = any(${transaction.tags}) then array['savings_transfer']::text[] else ${transaction.tags} end`
			: sql`case when 'savings_transfer' = any(${transaction.tags}) then array['transfer']::text[] else ${transaction.tags} end`;
	const transferIds = [...lookup.byId.values()]
		.filter((row) => row.kind === "transfer")
		.map((row) => row.id);
	if (transferIds.length === 0) {
		return swapped;
	}
	return sql`case when ${inArray(transaction.categoryId, transferIds)} then '{}'::text[] else ${swapped} end`;
}
