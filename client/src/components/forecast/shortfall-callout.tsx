import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { shortDate } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import type { Shortfall } from "@/types";

type Props = {
	shortfalls: Shortfall[];
	currency: string;
	onSelect: (date: string) => void;
};

/** Days the plan drops Operating cash under the Safety buffer; each opens its Month. */
export function ShortfallCallout({ shortfalls, currency, onSelect }: Props) {
	const headingId = useId();
	if (shortfalls.length === 0) {
		return null;
	}
	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-wrap items-center gap-2 rounded-xl border border-negative/40 bg-negative/5 px-4 py-3 text-sm"
		>
			<h2 id={headingId} className="flex items-center gap-2 font-medium text-negative">
				<TriangleAlert aria-hidden className="size-4" />
				{shortfalls.length} {shortfalls.length === 1 ? "shortfall" : "shortfalls"}
			</h2>
			{shortfalls.map((entry) => (
				<button
					key={entry.date}
					type="button"
					onClick={() => onSelect(entry.date)}
					className="rounded-md px-2 py-1 text-negative underline-offset-2 transition-colors hover:bg-negative/10 hover:underline"
				>
					{shortDate(entry.date)} (-{formatMoney(entry.short, currency)})
				</button>
			))}
		</section>
	);
}
