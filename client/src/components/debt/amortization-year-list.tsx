import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { formatMoney } from "@/lib/format";
import type { AmortizationRow } from "@/types";

type Props = {
	schedule: AmortizationRow[];
	currency: string;
};

function byYear(schedule: AmortizationRow[]) {
	const years = new Map<string, AmortizationRow[]>();
	for (const row of schedule) {
		const year = row.date.slice(0, 4);
		years.set(year, [...(years.get(year) ?? []), row]);
	}
	return [...years.entries()];
}

/** The Amortization schedule, one collapsible group per year. */
export function AmortizationYearList({ schedule, currency }: Props) {
	return (
		<div className="flex flex-col gap-2">
			{byYear(schedule).map(([year, rows]) => (
				<Collapsible.Root key={year} className="rounded-lg border border-border">
					<Collapsible.Trigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-foreground/5">
						<ChevronDown
							aria-hidden
							className="size-4 transition-transform group-data-[state=closed]:-rotate-90"
						/>
						{year}
						<span className="ml-auto text-muted-foreground">
							ends {formatMoney(rows.at(-1)?.endingBalance ?? 0, currency)}
						</span>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<table className="w-full border-t border-border text-xs">
							<thead className="text-muted-foreground">
								<tr>
									<th className="px-2 py-1 text-left font-normal">#</th>
									<th className="px-2 py-1 text-right font-normal">Payment</th>
									<th className="px-2 py-1 text-right font-normal">Interest</th>
									<th className="px-2 py-1 text-right font-normal">Principal</th>
									<th className="px-2 py-1 text-right font-normal">Extra</th>
									<th className="px-2 py-1 text-right font-normal">Balance</th>
								</tr>
							</thead>
							<tbody className="amount">
								{rows.map((row) => (
									<tr key={row.period} className="border-t border-border">
										<td className="px-2 py-1">{row.period}</td>
										<td className="px-2 py-1 text-right">{formatMoney(row.payment, currency)}</td>
										<td className="px-2 py-1 text-right">{formatMoney(row.interest, currency)}</td>
										<td className="px-2 py-1 text-right">{formatMoney(row.principal, currency)}</td>
										<td className="px-2 py-1 text-right">{formatMoney(row.extra, currency)}</td>
										<td className="px-2 py-1 text-right">
											{formatMoney(row.endingBalance, currency)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</Collapsible.Content>
				</Collapsible.Root>
			))}
		</div>
	);
}
