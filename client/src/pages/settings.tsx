import { useState } from "react";
import { Link } from "react-router";
import { downloadTransactionsCsv } from "@/api/export";
import { CsvDownloadButton } from "@/components/csv-download-button";
import { CustomizeDrawer } from "@/components/dashboard/customize-drawer";
import { CategoryManagerDrawer } from "@/components/drawers/category-manager-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { PreferenceSections } from "@/components/settings/preference-sections";
import { ProfileSection } from "@/components/settings/profile-section";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSettings } from "@/hooks/use-settings";

export function SettingsPage() {
	const settings = useSettings();
	const [isCategoriesOpen, setCategoriesOpen] = useState(false);
	const [isCustomizing, setCustomizing] = useState(false);

	return (
		<>
			<PageHeader title="Settings" />
			<div className="flex max-w-3xl flex-col gap-4">
				<ProfileSection />
				<SettingsSection
					title="Accounts"
					description="Connect, refresh, and disconnect banks on the Accounts page."
				>
					<Link
						to="/accounts"
						className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
					>
						Manage accounts
					</Link>
				</SettingsSection>
				<SettingsSection
					title="Categories"
					description="Add, rename, recolor, or delete transaction categories."
				>
					<button
						type="button"
						className="self-start rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
						onClick={() => setCategoriesOpen(true)}
					>
						Manage categories
					</button>
				</SettingsSection>
				<PreferenceSections onCustomizeWidgets={() => setCustomizing(true)} />
				<SettingsSection title="Data" description="Download every transaction as a CSV file.">
					<div className="self-start">
						<CsvDownloadButton label="Export transactions CSV" download={downloadTransactionsCsv} />
					</div>
				</SettingsSection>
			</div>
			{isCategoriesOpen ? <CategoryManagerDrawer onClose={() => setCategoriesOpen(false)} /> : null}
			{isCustomizing && settings.data ? (
				<CustomizeDrawer
					widgets={settings.data.dashboardWidgets}
					onClose={() => setCustomizing(false)}
				/>
			) : null}
		</>
	);
}
