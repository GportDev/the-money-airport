import { SummaryStat } from "@/components/forecast/summary-stat";
import type { ForecastSummary } from "@/types";

type Props = {
	summary: ForecastSummary;
};

function totalOf(values: Record<number, number>) {
	return Object.values(values).reduce((sum, value) => sum + value, 0);
}

/** The latest month that has a balance, i.e. year-end or the last known month. */
function latestOf(values: Record<number, number>) {
	const months = Object.keys(values).map(Number);
	const last = months.length > 0 ? Math.max(...months) : null;
	return last === null ? 0 : (values[last] ?? 0);
}

export function ForecastSummaryCards({ summary }: Props) {
	const currency = summary.baseCurrency;
	return (
		<dl aria-label="Year summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
			<SummaryStat label="Cash flow" cents={totalOf(summary.cashFlow)} currency={currency} />
			<SummaryStat
				label="Cash"
				cents={latestOf(summary.operatingCash)}
				currency={currency}
				hint="Operating cash, year-end"
			/>
			<SummaryStat
				label="Cards"
				cents={latestOf(summary.creditCardTotal)}
				currency={currency}
				hint="Year-end"
			/>
			<SummaryStat
				label="Savings"
				cents={latestOf(summary.savingsTotal)}
				currency={currency}
				hint="Funds and APY included"
			/>
			<SummaryStat label="Fixed" cents={totalOf(summary.fixedExpensesTotal)} currency={currency} />
			<SummaryStat
				label="Variable"
				cents={totalOf(summary.variableExpensesTotal)}
				currency={currency}
			/>
			<SummaryStat
				label="Debt payments"
				cents={totalOf(summary.debtPaymentsTotal)}
				currency={currency}
			/>
			<SummaryStat
				label="Total debt"
				cents={latestOf(summary.debtTotal)}
				currency={currency}
				hint="Year-end"
			/>
		</dl>
	);
}
