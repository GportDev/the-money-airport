import { DailyBalanceChart } from "@/components/forecast/daily-balance-chart";
import { MonthDayGroup } from "@/components/forecast/month-day-group";
import { SummaryStat } from "@/components/forecast/summary-stat";
import { useForecastMonth } from "@/hooks/use-forecast";
import { shortDate } from "@/lib/forecast";

type Props = {
	year: number;
	month: number;
};

export function MonthView({ year, month }: Props) {
	const forecast = useForecastMonth(year, month);
	if (forecast.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load this month.
			</p>
		);
	}
	const data = forecast.data;
	if (!data) {
		return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
	}
	const currency = data.baseCurrency;
	return (
		<div className="flex flex-col gap-4">
			<dl aria-label="Month summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<SummaryStat label="Opening" cents={data.openingBalance} currency={currency} />
				<SummaryStat
					label="Low point"
					cents={data.lowPoint.value}
					currency={currency}
					hint={`on ${shortDate(data.lowPoint.date)}`}
				/>
				<SummaryStat label="Closing" cents={data.closingBalance} currency={currency} />
			</dl>
			<div className="rounded-xl border border-border bg-card p-4">
				<DailyBalanceChart month={data} />
			</div>
			{data.days.length === 0 ? (
				<p className="py-6 text-center text-sm text-muted-foreground">
					Nothing planned for the rest of this month.
				</p>
			) : (
				data.days.map((day) => (
					<MonthDayGroup
						key={day.date}
						day={day}
						currency={currency}
						isShort={day.balanceAfter < data.safetyBuffer}
					/>
				))
			)}
		</div>
	);
}
