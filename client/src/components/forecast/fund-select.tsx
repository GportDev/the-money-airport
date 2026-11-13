import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGoals } from "@/hooks/use-goals";

const NO_FUND = "no-fund";

type Props = {
	value: string | null;
	onChange: (goalId: string | null) => void;
};

/** The Fund a savings deposit grows. */
export function FundSelect({ value, onChange }: Props) {
	const goals = useGoals("save_up");
	const funds = (goals.data?.goals ?? []).filter((goal) => goal.funding === "fund");
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label htmlFor="forecast-fund">Fund</label>
			<Select
				value={value ?? NO_FUND}
				onValueChange={(next) => onChange(next === NO_FUND ? null : next)}
			>
				<SelectTrigger id="forecast-fund">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NO_FUND}>No Fund</SelectItem>
					{funds.map((fund) => (
						<SelectItem key={fund.id} value={fund.id}>
							{fund.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
