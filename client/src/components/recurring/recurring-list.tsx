import { RecurringRow } from "@/components/recurring/recurring-row";
import type { RecurringListItem } from "@/types";

type Props = {
	title: string;
	items: RecurringListItem[];
	onOpen: (item: RecurringListItem) => void;
};

/** One timeline group; the server already sorts items by next date. */
export function RecurringList({ title, items, onOpen }: Props) {
	if (items.length === 0) return null;
	const headingId = `recurring-${title.toLowerCase()}-heading`;
	return (
		<section aria-labelledby={headingId} className="rounded-xl border border-border bg-card">
			<h2 id={headingId} className="px-3 py-3 text-sm font-medium">
				{title}
			</h2>
			<ul className="divide-y divide-border border-t border-border">
				{items.map((item) => (
					<RecurringRow key={item.id} item={item} onOpen={onOpen} />
				))}
			</ul>
		</section>
	);
}
