import { PageHeader } from "../components/layout/page-header";
import { Card, CardHeader, CardTitle } from "../components/ui/card";

export function DashboardPage() {
	return (
		<>
			<PageHeader title="Dashboard" />
			<Card>
				<CardHeader>
					<CardTitle>Money Airport</CardTitle>
				</CardHeader>
			</Card>
		</>
	);
}
