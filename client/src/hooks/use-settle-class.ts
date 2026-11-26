import { useState } from "react";

/**
 * "animate-fade-in" when this component first rendered while its data was loading, so content
 * settles in after its skeleton. Cached data renders at once and refetches never replay it.
 */
export function useSettleClass(isLoading: boolean) {
	const [sawLoading] = useState(isLoading);
	return sawLoading ? "animate-fade-in" : undefined;
}
