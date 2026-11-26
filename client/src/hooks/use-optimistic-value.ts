import { useState } from "react";

/**
 * Local copy of a saved value: shows a change at once, follows the server when it refetches,
 * and goes back to the saved value when the save fails.
 */
export function useOptimisticValue<T>(saved: T) {
	const [value, setValue] = useState(saved);
	const [lastSaved, setLastSaved] = useState(saved);
	if (saved !== lastSaved) {
		setLastSaved(saved);
		setValue(saved);
	}
	return { value, setValue, revert: () => setValue(saved) };
}
