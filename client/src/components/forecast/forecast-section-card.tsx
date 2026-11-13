import { ChevronDown, Plus } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useId } from "react";
import { ForecastRowItem } from "@/components/forecast/forecast-row-item";
import { OneOffItem } from "@/components/forecast/one-off-item";
import type { ForecastRow, ForecastSection, OneOff } from "@/types";

type Props = {
	section: ForecastSection;
	currency: string;
	cardNames: Map<string, string>;
	fundNames: Map<string, string>;
	onAddRow: () => void;
	onAddOneOff: () => void;
	onOpenRow: (row: ForecastRow) => void;
	onOpenOneOff: (oneOff: OneOff) => void;
};

/** One collapsible plan section: its items, then its One-offs. */
export function ForecastSectionCard({
	section,
	currency,
	cardNames,
	fundNames,
	onAddRow,
	onAddOneOff,
	onOpenRow,
	onOpenOneOff,
}: Props) {
	const headingId = useId();
	const isEmpty = section.rows.length === 0 && section.oneOffs.length === 0;
	return (
		<Collapsible.Root defaultOpen asChild>
			<section aria-labelledby={headingId} className="rounded-xl border border-border bg-card">
				<div className="flex items-center gap-2 px-3 py-2">
					<Collapsible.Trigger className="group flex flex-1 items-center gap-2 rounded-md py-1 text-left text-sm font-medium transition-colors hover:text-foreground/80">
						<ChevronDown
							aria-hidden
							className="size-4 transition-transform group-data-[state=closed]:-rotate-90"
						/>
						<h2 id={headingId}>{section.name}</h2>
					</Collapsible.Trigger>
					<button
						type="button"
						aria-label={`Add item to ${section.name}`}
						onClick={onAddRow}
						className="flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-foreground/5"
					>
						<Plus aria-hidden className="size-4" />
						Item
					</button>
					<button
						type="button"
						aria-label={`Add one-off to ${section.name}`}
						onClick={onAddOneOff}
						className="flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-foreground/5"
					>
						<Plus aria-hidden className="size-4" />
						One-off
					</button>
				</div>
				<Collapsible.Content>
					{isEmpty ? (
						<p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">
							Nothing planned yet.
						</p>
					) : (
						<ul className="divide-y divide-border border-t border-border">
							{section.rows.map((row) => (
								<ForecastRowItem
									key={row.id}
									row={row}
									currency={currency}
									cardName={row.bankAccountId ? (cardNames.get(row.bankAccountId) ?? null) : null}
									fundName={row.goalId ? (fundNames.get(row.goalId) ?? null) : null}
									onOpen={onOpenRow}
								/>
							))}
							{section.oneOffs.map((oneOff) => (
								<OneOffItem
									key={oneOff.id}
									oneOff={oneOff}
									currency={currency}
									onOpen={onOpenOneOff}
								/>
							))}
						</ul>
					)}
				</Collapsible.Content>
			</section>
		</Collapsible.Root>
	);
}
