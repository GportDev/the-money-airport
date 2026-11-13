import { useState } from "react";
import { longMonthName, MONTH_NUMBERS } from "@/lib/forecast";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";

type Props = {
	year: number;
	/** Month (1-12) → amount in major units, as typed. */
	amounts: Record<number, string>;
	onChange: (amounts: Record<number, string>) => void;
};

/** Twelve monthly Plan amounts, with one amount that can be copied into every month. */
export function PlanAmountsFields({ year, amounts, onChange }: Props) {
	const [everyMonth, setEveryMonth] = useState("");
	const canCopy = everyMonth.trim() !== "" && Number.isFinite(Number(everyMonth));

	function copyToAll() {
		const value = centsToMajorUnits(majorUnitsToCents(everyMonth));
		onChange(Object.fromEntries(MONTH_NUMBERS.map((month) => [month, value])));
	}

	return (
		<fieldset className="flex flex-col gap-3 text-sm">
			<legend className="mb-2 font-medium">Plan for {year}</legend>
			<div className="flex items-end gap-2">
				<label className="flex flex-1 flex-col gap-1" htmlFor="plan-every-month">
					Amount for every month
					<input
						id="plan-every-month"
						className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						type="number"
						inputMode="decimal"
						min="0"
						step="0.01"
						value={everyMonth}
						onChange={(event) => setEveryMonth(event.target.value)}
					/>
				</label>
				<button
					type="button"
					disabled={!canCopy}
					onClick={copyToAll}
					className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5 disabled:opacity-60"
				>
					Copy to all months
				</button>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{MONTH_NUMBERS.map((month) => (
					<label
						key={month}
						className="flex flex-col gap-1 text-xs text-muted-foreground"
						htmlFor={`plan-month-${month}`}
					>
						{longMonthName(month)}
						<input
							id={`plan-month-${month}`}
							className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground transition-colors hover:border-foreground/30"
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={amounts[month] ?? ""}
							onChange={(event) => onChange({ ...amounts, [month]: event.target.value })}
						/>
					</label>
				))}
			</div>
		</fieldset>
	);
}
