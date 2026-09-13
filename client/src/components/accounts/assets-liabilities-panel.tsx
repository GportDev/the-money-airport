import { useSearchParams } from "react-router";
import { useNetWorth } from "../../hooks/use-accounts";
import { formatMoney } from "../../lib/format";
import { DISPLAY_GROUPS } from "../../types";
import { Amount } from "../ui/amount";

export function AssetsLiabilitiesPanel() {
	const [searchParams, setSearchParams] = useSearchParams();
	const range = searchParams.get("range") ?? "1m";
	const unit = searchParams.get("unit") === "percent" ? "percent" : "totals";
	const { data } = useNetWorth(range);
	const currency = data?.baseCurrency ?? "USD";
	const assets = data?.assets ?? [];
	const liabilities = data?.liabilities ?? [];
	const assetTotal = assets.reduce((sum, row) => sum + row.total, 0);
	const liabilityTotal = liabilities.reduce((sum, row) => sum + row.total, 0);

	function setUnit(next: "totals" | "percent") {
		const nextParams = new URLSearchParams(searchParams);
		if (next === "totals") {
			nextParams.delete("unit");
		} else {
			nextParams.set("unit", next);
		}
		setSearchParams(nextParams);
	}

	return (
		<div className="flex flex-col gap-4">
			<fieldset className="border-0 p-0">
				<legend className="sr-only">Panel unit</legend>
				<button
					className={`mr-2 text-sm ${unit === "totals" ? "font-semibold" : "text-muted-foreground"}`}
					type="button"
					aria-pressed={unit === "totals"}
					onClick={() => setUnit("totals")}
				>
					Totals
				</button>
				<button
					className={`text-sm ${unit === "percent" ? "font-semibold" : "text-muted-foreground"}`}
					type="button"
					aria-pressed={unit === "percent"}
					onClick={() => setUnit("percent")}
				>
					Percent
				</button>
			</fieldset>
			<section>
				<h2 className="text-sm font-medium">Assets</h2>
				<p>
					<Amount>{unit === "percent" ? "100%" : formatMoney(assetTotal, currency)}</Amount>
				</p>
				<StackedBars rows={assets} total={assetTotal} unit={unit} currency={currency} />
			</section>
			<section>
				<h2 className="text-sm font-medium">Liabilities</h2>
				<p>
					<Amount>{unit === "percent" ? "100%" : formatMoney(liabilityTotal, currency)}</Amount>
				</p>
				<StackedBars rows={liabilities} total={liabilityTotal} unit={unit} currency={currency} />
			</section>
		</div>
	);
}

function StackedBars({
	rows,
	total,
	unit,
	currency,
}: {
	rows: { group: string; total: number }[];
	total: number;
	unit: "totals" | "percent";
	currency: string;
}) {
	const widthTotal = Math.max(1, total);
	return (
		<div className="mt-2">
			<div className="flex h-3 w-full overflow-hidden rounded-sm bg-secondary">
				{rows.map((row, index) => (
					<span
						key={row.group}
						className="h-full bg-primary"
						style={{
							width: `${(row.total / widthTotal) * 100}%`,
							opacity: 1 - index * 0.15,
						}}
					/>
				))}
			</div>
			<ul className="mt-2 flex flex-col gap-1">
				{rows.map((row) => (
					<li key={row.group} className="flex justify-between text-xs text-muted-foreground">
						<span>{labelFor(row.group)}</span>
						<span>
							{unit === "percent"
								? `${Math.round((row.total / widthTotal) * 100)}%`
								: formatMoney(row.total, currency)}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function labelFor(group: string) {
	return DISPLAY_GROUPS.find((item) => item.key === group)?.label ?? group;
}
