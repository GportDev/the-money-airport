/** `ids` with `id` taken out and put back just before or after `targetId`. */
export function placeNear(ids: string[], id: string, targetId: string, isAfter: boolean) {
	const rest = ids.filter((item) => item !== id);
	const at = rest.indexOf(targetId);
	if (at === -1) return ids;
	rest.splice(isAfter ? at + 1 : at, 0, id);
	return rest;
}

/** `ids` with `id` moved `delta` places, or `ids` itself when that would leave the list. */
export function shiftBy(ids: string[], id: string, delta: number) {
	const from = ids.indexOf(id);
	const to = from + delta;
	if (from === -1 || to < 0 || to >= ids.length) return ids;
	const rest = ids.filter((item) => item !== id);
	rest.splice(to, 0, id);
	return rest;
}

export function isSameOrder(a: string[], b: string[]) {
	return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** `items` sorted to follow `ids`; items not in `ids` keep their order at the end. */
export function orderedBy<T extends { id: string }>(items: T[], ids: string[]) {
	const rank = new Map(ids.map((id, index) => [id, index]));
	const last = ids.length;
	return [...items].sort((a, b) => (rank.get(a.id) ?? last) - (rank.get(b.id) ?? last));
}
