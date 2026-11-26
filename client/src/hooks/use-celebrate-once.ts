import { useEffect, useState } from "react";

const STORAGE_PREFIX = "money-airport:celebrated:";

function hasCelebrated(key: string) {
	try {
		return window.localStorage.getItem(STORAGE_PREFIX + key) !== null;
	} catch (_error) {
		return false;
	}
}

/**
 * True the first time this viewer sees `key` reach its moment (a goal hitting 100%), so the
 * celebration plays once. Storage is a per-viewer convenience: when it is blocked the moment
 * may replay, and nothing else breaks.
 */
export function useCelebrateOnce(key: string, isReached: boolean) {
	const [shouldCelebrate] = useState(() => isReached && !hasCelebrated(key));
	useEffect(() => {
		if (!isReached) return;
		try {
			window.localStorage.setItem(STORAGE_PREFIX + key, "1");
		} catch (_error) {
			// Blocked storage only means the celebration can play again.
		}
	}, [key, isReached]);
	return shouldCelebrate;
}
