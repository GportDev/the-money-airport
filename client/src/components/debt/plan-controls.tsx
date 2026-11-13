import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useUpdateSettings } from "@/hooks/use-dashboard";
import { LAST_DAY, STRATEGY_OPTIONS } from "@/lib/debt";
import { centsToMajorUnits, majorUnitsToCents } from "@/lib/format";
import type { DebtStrategy, UserSettings } from "@/types";

const PAYBACK_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

type Props = {
	settings: UserSettings;
};

/** Strategy, Safety buffer, and payback day: the same controls on the Debt tab and in Settings. */
export function PlanControls({ settings }: Props) {
	const update = useUpdateSettings();
	const [buffer, setBuffer] = useState(centsToMajorUnits(settings.safetyBuffer));

	async function save(patch: Parameters<typeof update.mutateAsync>[0], message: string) {
		try {
			await update.mutateAsync(patch);
			toast.success(message);
		} catch (_error) {
			toast.error("Could not save the plan settings");
		}
	}

	function onBufferSubmit(event: FormEvent) {
		event.preventDefault();
		const cents = majorUnitsToCents(buffer);
		if (!Number.isFinite(cents) || cents < 0) {
			toast.error("The Safety buffer is 0 or more");
			return;
		}
		void save({ safetyBuffer: cents }, "Safety buffer saved");
	}

	return (
		<div className="flex flex-wrap items-end gap-3 text-sm">
			<div className="flex flex-col gap-1">
				<label htmlFor="plan-strategy">Strategy</label>
				<Select
					value={settings.debtStrategy}
					onValueChange={(next) =>
						void save({ debtStrategy: next as DebtStrategy }, "Strategy saved")
					}
				>
					<SelectTrigger id="plan-strategy" className="min-w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STRATEGY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<form className="flex items-end gap-2" onSubmit={onBufferSubmit}>
				<label className="flex flex-col gap-1" htmlFor="plan-buffer">
					Safety buffer
					<input
						id="plan-buffer"
						className="w-28 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
						type="number"
						inputMode="decimal"
						min="0"
						step="0.01"
						value={buffer}
						onChange={(event) => setBuffer(event.target.value)}
					/>
				</label>
				<button
					type="submit"
					disabled={update.isPending}
					className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5 disabled:opacity-60"
				>
					Save buffer
				</button>
			</form>
			<div className="flex flex-col gap-1">
				<label htmlFor="plan-payback-day">Payback day</label>
				<Select
					value={settings.paybackDay === null ? LAST_DAY : String(settings.paybackDay)}
					onValueChange={(next) =>
						void save({ paybackDay: next === LAST_DAY ? null : Number(next) }, "Payback day saved")
					}
				>
					<SelectTrigger id="plan-payback-day" className="min-w-28">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={LAST_DAY}>Last day</SelectItem>
						{PAYBACK_DAYS.map((day) => (
							<SelectItem key={day} value={String(day)}>
								Day {day}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
