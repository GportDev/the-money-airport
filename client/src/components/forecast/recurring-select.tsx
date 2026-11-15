import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useRecurring } from "@/hooks/use-recurring";

/** Radix Select needs a non-empty value; this one stands for "no RecurringItem" (null). */
const NONE = "none";

type Props = { value: string | null; onChange: (recurringItemId: string | null) => void };

/** Links a plan row to a RecurringItem, so Actuals match that merchant instead of the Category. */
export function RecurringSelect({ value, onChange }: Props) {
	const recurring = useRecurring();
	const items = (recurring.data?.items ?? []).filter((item) => item.isActive || item.id === value);
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label htmlFor="forecast-row-recurring">Recurring bill</label>
			<Select value={value ?? NONE} onValueChange={(next) => onChange(next === NONE ? null : next)}>
				<SelectTrigger id="forecast-row-recurring">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NONE}>None</SelectItem>
					{items.map((item) => (
						<SelectItem key={item.id} value={item.id}>
							{item.merchantName}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
