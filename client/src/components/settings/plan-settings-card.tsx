import { PlanControls } from "@/components/debt/plan-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";

/** Settings → Plan: the same controls as the Forecasting Debt tab. */
export function PlanSettingsCard() {
	const settings = useSettings();
	return (
		<Card>
			<CardHeader>
				<CardTitle>Plan</CardTitle>
				<CardDescription>
					Payback sends spare Operating cash to debt without going below the Safety buffer.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{settings.data ? (
					<PlanControls
						key={`${settings.data.safetyBuffer}-${settings.data.debtStrategy}`}
						settings={settings.data}
					/>
				) : (
					<p className="text-sm text-muted-foreground">Loading…</p>
				)}
			</CardContent>
		</Card>
	);
}
