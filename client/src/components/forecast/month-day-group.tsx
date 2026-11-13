import { useId } from "react";
import { Amount } from "@/components/ui/amount";
import { formatLongDate, formatMoney, formatSignedMoney } from "@/lib/format";
import type { ForecastMonth } from "@/types";

type Props = {
	day: ForecastMonth["days"][number];
	currency: string;
	isShort: boolean;
};

/** One date: its net, the balance after it, and the plan items that land that day. */
export function MonthDayGroup({ day, currency, isShort }: Props) {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="rounded-xl border border-border bg-card">
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-sm">
				<h3 id={headingId} className="font-medium">
					{formatLongDate(day.date)}
				</h3>
				<Amount className="text-muted-foreground">{formatSignedMoney(day.net, currency)}</Amount>
				<Amount className={isShort ? "ml-auto text-negative" : "ml-auto text-muted-foreground"}>
					balance {formatMoney(day.balanceAfter, currency)}
				</Amount>
			</header>
			<ul className="divide-y divide-border">
				{day.items.map((item) => (
					<li
						key={`${item.kind}-${item.sourceId ?? item.name}`}
						className="flex items-center justify-between px-3 py-2 text-sm"
					>
						<span>
							{item.name}
							{item.split && item.split.length > 0 ? (
								<span className="text-muted-foreground">
									{" "}
									(
									{item.split
										.map((part) => `${part.name} ${formatMoney(part.amount, currency)}`)
										.join(" · ")}
									)
								</span>
							) : null}
						</span>
						<Amount>{formatSignedMoney(item.amount, currency)}</Amount>
					</li>
				))}
			</ul>
		</section>
	);
}
