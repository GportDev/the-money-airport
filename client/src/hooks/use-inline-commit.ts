import { useState } from "react";
import { toast } from "sonner";

type Options = {
	value: string;
	onCommit: (next: string) => Promise<unknown> | unknown;
	allowEmpty: boolean;
};

/**
 * Draft state for an inline field: follows the saved value, commits only real changes, and goes
 * back to the saved value (with an error toast) when the save fails.
 */
export function useInlineCommit({ value, onCommit, allowEmpty }: Options) {
	const [draft, setDraft] = useState(value);
	const [lastValue, setLastValue] = useState(value);
	const [isSaving, setIsSaving] = useState(false);
	if (value !== lastValue) {
		setLastValue(value);
		setDraft(value);
	}

	function revert() {
		setDraft(value);
	}

	async function commit() {
		const next = draft.trim();
		if (next === value.trim()) {
			setDraft(value);
			return;
		}
		if (next === "" && !allowEmpty) {
			revert();
			return;
		}
		setIsSaving(true);
		try {
			await onCommit(next);
		} catch (error) {
			revert();
			toast.error(error instanceof Error && error.message ? error.message : "Could not save");
		} finally {
			setIsSaving(false);
		}
	}

	return { draft, setDraft, isSaving, commit, revert };
}
