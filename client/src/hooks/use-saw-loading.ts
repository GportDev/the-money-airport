import { useState } from "react";

/**
 * True when this component first rendered while its data was still loading, so the content
 * can settle in after the skeleton. Cached data renders straight away and never animates.
 */
export function useSawLoading(isLoading: boolean) {
	const [sawLoading] = useState(isLoading);
	return sawLoading;
}
