import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ title }: { title: string }) {
	return (
		<>
			<PageHeader title={title} />
			<Card>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
			</Card>
		</>
	);
}
