import { createContext, type RefObject, useContext } from "react";

/** The page content area scrolls, not the window; virtual lists measure against it. */
export const ScrollContainerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useScrollContainer() {
	const ref = useContext(ScrollContainerContext);
	if (!ref) {
		throw new Error("useScrollContainer must be used inside PageLayout");
	}
	return ref;
}
