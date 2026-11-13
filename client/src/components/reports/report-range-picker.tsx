import { REPORT_PRESETS, type ReportPreset } from "@/lib/report-range";
import type { ReportRange } from "@/types";

type Props = {
	preset: ReportPreset;
	range: ReportRange;
	onPresetChange: (preset: ReportPreset) => void;
	onCustomChange: (range: ReportRange) => void;
};

export function ReportRangePicker({ preset, range, onPresetChange, onCustomChange }: Props) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<label className="flex items-center gap-2 text-sm" htmlFor="report-range">
				Date range
				{/* CONVENTION-DEVIATION: native select, matching the range pickers on Accounts and Cash Flow. */}
				<select
					id="report-range"
					className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/30"
					value={preset}
					onChange={(event) => onPresetChange(event.target.value as ReportPreset)}
				>
					{REPORT_PRESETS.map((option) => (
						<option key={option.key} value={option.key}>
							{option.label}
						</option>
					))}
				</select>
			</label>
			{preset === "custom" ? (
				<>
					<label className="sr-only" htmlFor="report-from">
						From
					</label>
					<input
						id="report-from"
						type="date"
						className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/30"
						value={range.dateFrom}
						max={range.dateTo}
						onChange={(event) =>
							event.target.value && onCustomChange({ ...range, dateFrom: event.target.value })
						}
					/>
					<span className="text-sm text-muted-foreground">to</span>
					<label className="sr-only" htmlFor="report-to">
						To
					</label>
					<input
						id="report-to"
						type="date"
						className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/30"
						value={range.dateTo}
						min={range.dateFrom}
						onChange={(event) =>
							event.target.value && onCustomChange({ ...range, dateTo: event.target.value })
						}
					/>
				</>
			) : null}
		</div>
	);
}
