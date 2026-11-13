import { Sparkline } from "@/components/accounts/sparkline";
import { Amount } from "@/components/ui/amount";
import { useDebtSection } from "@/hooks/use-forecast";
import { MONTH_NUMBERS } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";

type Props = {
	year: number;
	currency: string;
	onOpenDebt: () => void;
};

/** Read-only: card payments, loan payments, and Payback per month, edited on the Debt tab. */
export function DebtSectionCard({ year, currency, onOpenDebt }: Props) {
	const section = useDebtSection(year);
	const rows = section.data?.rows ?? [];
	if (section.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load the Debt section.
			</p>
		);
	}
	if (rows.length === 0) return null;
	return (
		<section
			aria-labelledby="forecast-debt-heading"
			className="rounded-xl border border-border bg-card"
		>
			<h2 id="forecast-debt-heading" className="px-3 py-3 text-sm font-medium">
				Debt <span className="font-normal text-muted-foreground">(computed)</span>
			</h2>
			<ul className="divide-y divide-border border-t border-border">
				{rows.map((row) => {
					const monthly = MONTH_NUMBERS.map((month) => {
						const cell = row.cells[month];
						return (cell?.scheduled ?? 0) + (cell?.payback ?? 0);
					});
					const scheduled = MONTH_NUMBERS.reduce(
						(sum, month) => sum + (row.cells[month]?.scheduled ?? 0),
						0,
					);
					const payback = MONTH_NUMBERS.reduce(
						(sum, month) => sum + (row.cells[month]?.payback ?? 0),
						0,
					);
					return (
						<li key={row.bankAccountId}>
							<button
								type="button"
								onClick={onOpenDebt}
								className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
							>
								<span className="flex-1 truncate font-medium">{row.name} payment</span>
								<span aria-hidden className="hidden sm:block">
									<Sparkline points={monthly.map((value) => ({ value }))} width={96} height={20} />
								</span>
								<Amount className="w-32 text-right text-muted-foreground">
									{formatMoney(scheduled, currency)}
								</Amount>
								<Amount className="w-36 text-right text-muted-foreground">
									Payback {formatMoney(payback, currency)}
								</Amount>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
