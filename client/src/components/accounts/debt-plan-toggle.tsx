import { Checkbox } from "@/components/ui/checkbox";

type Props = {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
};

export function DebtPlanToggle({ checked, onCheckedChange }: Props) {
	return (
		<div className="flex flex-col gap-1 text-sm">
			<label className="flex items-center gap-2" htmlFor="account-debt-plan">
				<Checkbox
					id="account-debt-plan"
					checked={checked}
					onCheckedChange={(next) => onCheckedChange(next === true)}
				/>
				In debt plan
			</label>
			<p className="text-xs text-muted-foreground">Payback pays down debt plan cards and loans.</p>
		</div>
	);
}
