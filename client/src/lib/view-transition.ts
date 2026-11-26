import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
	startViewTransition?: (update: () => void) => unknown;
};

/**
 * Runs a list reorder inside a View Transition so items glide to their new place. Falls back to
 * an instant update where the API is missing or the User prefers reduced motion.
 */
export function withViewTransition(update: () => void) {
	const doc = document as ViewTransitionDocument;
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (!doc.startViewTransition || prefersReducedMotion) {
		update();
		return;
	}
	doc.startViewTransition(() => flushSync(update));
}

/** A `view-transition-name` that is unique per list item and valid as a CSS identifier. */
export function transitionName(scope: string, id: string) {
	return `${scope}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
