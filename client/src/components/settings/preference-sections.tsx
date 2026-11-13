import { BaseCurrencySelect } from "@/components/settings/base-currency-select";
import { CopyForwardToggle } from "@/components/settings/copy-forward-toggle";
import { PlanSection } from "@/components/settings/plan-section";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { QueryError } from "@/components/ui/query-error";
import { useSettings } from "@/hooks/use-settings";

type Props = { onCustomizeWidgets: () => void };

/** Dashboard, Budget, Plan, and Currency: the sections backed by saved settings. */
export function PreferenceSections({ onCustomizeWidgets }: Props) {
	const settings = useSettings();
	if (settings.isPending) return <SettingsSkeleton />;
	if (settings.isError) {
		return (
			<QueryError
				message="Could not load settings."
				isRetrying={settings.isFetching}
				onRetry={() => void settings.refetch()}
			/>
		);
	}
	return (
		<>
			<SettingsSection title="Dashboard" description="Choose which widgets show and in what order.">
				<button
					type="button"
					className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
					onClick={onCustomizeWidgets}
				>
					Customize widgets
				</button>
			</SettingsSection>
			<SettingsSection
				title="Budget"
				description="Copy plans into a new month that has none. No rollover."
			>
				<CopyForwardToggle isOn={settings.data.budgetCopyForward} />
			</SettingsSection>
			<PlanSection settings={settings.data} />
			<SettingsSection
				title="Currency"
				description="Totals, budgets, and reports convert into this currency."
			>
				<BaseCurrencySelect value={settings.data.currency} />
			</SettingsSection>
		</>
	);
}
