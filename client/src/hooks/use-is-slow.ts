import { useEffect, useState } from "react";
import { SLOW_FETCH_MS } from "@/lib/constants";

/** True once `isWaiting` has held for SLOW_FETCH_MS; quick waits never flip it. */
export function useIsSlow(isWaiting: boolean) {
	const [isSlow, setIsSlow] = useState(false);
	useEffect(() => {
		if (!isWaiting) {
			setIsSlow(false);
			return;
		}
		const timer = window.setTimeout(() => setIsSlow(true), SLOW_FETCH_MS);
		return () => window.clearTimeout(timer);
	}, [isWaiting]);
	return isWaiting && isSlow;
}
