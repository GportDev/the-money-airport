import { Checkbox } from "@/components/ui/checkbox";

type Props = {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
};

export function CashPlanToggle({ checked, onCheckedChange }: Props) {
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label className="flex items-center gap-2" htmlFor="account-cash-plan">
				<Checkbox
					id="account-cash-plan"
					checked={checked}
					onCheckedChange={(next) => onCheckedChange(next === true)}
				/>
				In cash plan
			</label>
			<p className="text-xs text-muted-foreground">
				The Forecast pays bills from and receives income into cash plan accounts.
			</p>
		</div>
	);
}
