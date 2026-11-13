import { DebtSectionCard } from "@/components/forecast/debt-section-card";
import { ForecastSectionCard } from "@/components/forecast/forecast-section-card";
import { ForecastSummaryCards } from "@/components/forecast/forecast-summary-cards";
import { ProjectedBalanceChart } from "@/components/forecast/projected-balance-chart";
import { ShortfallCallout } from "@/components/forecast/shortfall-callout";
import { useAccounts } from "@/hooks/use-accounts";
import { useForecastSections, useForecastSummary } from "@/hooks/use-forecast";
import { useGoals } from "@/hooks/use-goals";
import { todayIso } from "@/lib/format";
import type { ForecastRow, ForecastSection, OneOff } from "@/types";

type Props = {
	year: number;
	onAddRow: (section: ForecastSection) => void;
	onOpenRow: (section: ForecastSection, row: ForecastRow) => void;
	onAddOneOff: (section: ForecastSection) => void;
	onOpenOneOff: (section: ForecastSection, oneOff: OneOff) => void;
	onSelectShortfall: (date: string) => void;
	onOpenDebt: () => void;
};

function useLinkNames() {
	const accounts = useAccounts();
	const goals = useGoals("save_up");
	const cardNames = new Map(
		(accounts.data ?? [])
			.filter((account) => account.displayGroup === "credit")
			.map((account) => [account.id, account.name]),
	);
	const fundNames = new Map((goals.data?.goals ?? []).map((goal) => [goal.id, goal.name]));
	return { cardNames, fundNames };
}

export function YearView({
	year,
	onAddRow,
	onOpenRow,
	onAddOneOff,
	onOpenOneOff,
	onSelectShortfall,
	onOpenDebt,
}: Props) {
	const summary = useForecastSummary(year);
	const sections = useForecastSections(year);
	const { cardNames, fundNames } = useLinkNames();
	const today = todayIso();
	const currentMonth = Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) : null;
	const currency = summary.data?.baseCurrency ?? "USD";

	if (summary.isError || sections.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load the plan.
			</p>
		);
	}
	if (!summary.data || !sections.data) {
		return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
	}
	return (
		<div className="flex flex-col gap-4">
			<ForecastSummaryCards summary={summary.data} />
			<div className="rounded-xl border border-border bg-card p-4">
				<ProjectedBalanceChart summary={summary.data} currentMonth={currentMonth} />
			</div>
			<ShortfallCallout
				shortfalls={summary.data.shortfalls}
				currency={currency}
				onSelect={onSelectShortfall}
			/>
			{sections.data.map((section) => (
				<ForecastSectionCard
					key={section.id}
					section={section}
					currency={currency}
					cardNames={cardNames}
					fundNames={fundNames}
					onAddRow={() => onAddRow(section)}
					onAddOneOff={() => onAddOneOff(section)}
					onOpenRow={(row) => onOpenRow(section, row)}
					onOpenOneOff={(oneOff) => onOpenOneOff(section, oneOff)}
				/>
			))}
			<DebtSectionCard year={year} currency={currency} onOpenDebt={onOpenDebt} />
		</div>
	);
}
