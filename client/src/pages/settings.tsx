import { PageHeader } from "../components/layout/page-header";
import { Card, CardHeader, CardTitle } from "../components/ui/card";

const SETTINGS_SECTIONS = [
	"Profile",
	"Accounts",
	"Categories",
	"Dashboard",
	"Budget",
	"Currency",
	"Data",
] as const;

export function SettingsPage() {
	return (
		<>
			<PageHeader title="Settings" />
			<div className="flex flex-col gap-4">
				{SETTINGS_SECTIONS.map((section) => (
					<Card key={section}>
						<CardHeader>
							<CardTitle>{section}</CardTitle>
						</CardHeader>
					</Card>
				))}
			</div>
		</>
	);
}
