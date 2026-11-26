import { useEffect, useRef, useState } from "react";

const FLASH_MS = 1100;

/** Feed rows changed somewhere else (drawer, split, bulk edit) glow once so the eye finds them. */
export function useRowFlash() {
	const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set());
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	function flash(ids: Iterable<string>) {
		const next = new Set(ids);
		if (next.size === 0) return;
		window.clearTimeout(timer.current);
		setFlashIds(next);
		timer.current = window.setTimeout(() => setFlashIds(new Set()), FLASH_MS);
	}

	return { flashIds, flash };
}
