/** What a feed-row title edit does: set the merchant, rename the Transaction, or clear the merchant. */
export type TitleEdit =
	| { kind: "merchant"; value: string; label: string }
	| { kind: "rename"; value: string; label: string }
	| { kind: "remove"; value: ""; label: string };

const MAX_MERCHANT_OPTIONS = 8;

/** Options for a typed query: matching merchants, then add-as-merchant and rename, then remove. */
export function titleEditOptions(
	query: string,
	merchants: string[],
	current: { name: string; merchantName: string | null },
): TitleEdit[] {
	const typed = query.trim();
	const needle = typed.toLowerCase();
	const matches = merchants
		.filter((name) => needle === "" || name.toLowerCase().includes(needle))
		.slice(0, MAX_MERCHANT_OPTIONS)
		.map((name): TitleEdit => ({ kind: "merchant", value: name, label: name }));
	const options: TitleEdit[] = [...matches];
	const isKnown = merchants.some((name) => name.toLowerCase() === needle);
	if (typed !== "" && !isKnown) {
		options.push({ kind: "merchant", value: typed, label: `Add “${typed}” as merchant` });
	}
	if (typed !== "" && typed !== current.name) {
		options.push({ kind: "rename", value: typed, label: `Rename to “${typed}”` });
	}
	if (typed === "" && current.merchantName) {
		options.push({ kind: "remove", value: "", label: "Remove merchant" });
	}
	return options;
}

/** Enter with nothing highlighted changes what the row shows: the merchant if set, else the name. */
export function defaultTitleEdit(query: string, hasMerchant: boolean): TitleEdit | null {
	const typed = query.trim();
	if (typed === "") return null;
	return hasMerchant
		? { kind: "merchant", value: typed, label: typed }
		: { kind: "rename", value: typed, label: typed };
}
