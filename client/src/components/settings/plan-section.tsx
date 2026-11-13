import { PlanControls } from "@/components/debt/plan-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import type { UserSettings } from "@/types";

type Props = { settings: UserSettings };

/** Settings → Plan: the same controls as the Forecasting Debt tab. */
export function PlanSection({ settings }: Props) {
	return (
		<SettingsSection
			title="Plan"
			description="Payback sends spare Operating cash to debt without going below the Safety buffer."
		>
			<PlanControls key={`${settings.safetyBuffer}-${settings.debtStrategy}`} settings={settings} />
		</SettingsSection>
	);
}
