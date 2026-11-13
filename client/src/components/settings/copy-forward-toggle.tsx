import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateSettings } from "@/hooks/use-dashboard";

export function CopyForwardToggle({ isOn }: { isOn: boolean }) {
	const update = useUpdateSettings();

	function onChange(next: boolean) {
		update.mutate(
			{ budgetCopyForward: next },
			{
				onSuccess: () => toast.success(next ? "Copy forward on" : "Copy forward off"),
				onError: () => toast.error("Could not update copy forward"),
			},
		);
	}

	return (
		<div className="flex items-center gap-2 text-sm">
			<Checkbox
				id="copy-forward"
				checked={isOn}
				disabled={update.isPending}
				onCheckedChange={(next) => onChange(next === true)}
			/>
			<label htmlFor="copy-forward">Copy forward each month</label>
		</div>
	);
}
