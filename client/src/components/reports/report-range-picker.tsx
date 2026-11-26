import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
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
			<SelectField
				aria-label="Date range"
				variant="ghost"
				icon={<CalendarDays aria-hidden className="size-4" />}
				value={preset}
				options={REPORT_PRESETS.map((option) => ({ value: option.key, label: option.label }))}
				onValueChange={onPresetChange}
			/>
			{preset === "custom" ? (
				<>
					<label className="sr-only" htmlFor="report-from">
						From
					</label>
					<Input
						id="report-from"
						type="date"
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
					<Input
						id="report-to"
						type="date"
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
