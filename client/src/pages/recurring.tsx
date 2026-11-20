import { Repeat } from "lucide-react";
import { useState } from "react";
import { AddRecurringDrawer } from "@/components/drawers/add-recurring-drawer";
import { RecurringDrawer } from "@/components/drawers/recurring-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { DetectedBanner } from "@/components/recurring/detected-banner";
import { RecurringList } from "@/components/recurring/recurring-list";
import { RecurringSkeleton } from "@/components/recurring/recurring-skeleton";
import { RecurringSummary } from "@/components/recurring/recurring-summary";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { useRecurring, useRecurringCandidates } from "@/hooks/use-recurring";

/** "new" opens the add drawer; an id opens that item's drawer. */
type DrawerState = "new" | string | null;

export function RecurringPage() {
	const recurring = useRecurring();
	const candidates = useRecurringCandidates();
	const [drawer, setDrawer] = useState<DrawerState>(null);
	const data = recurring.data;
	const openItem = data?.items.find((item) => item.id === drawer);
	const active = data?.items.filter((item) => item.isActive) ?? [];
	const inactive = data?.items.filter((item) => !item.isActive) ?? [];
	const found = candidates.data ?? [];

	function content() {
		if (recurring.isError) {
			return (
				<QueryError
					message="Could not load recurring bills."
					isRetrying={recurring.isFetching}
					onRetry={() => void recurring.refetch()}
				/>
			);
		}
		if (!data) return <RecurringSkeleton />;
		if (data.items.length === 0 && found.length === 0) {
			return (
				<EmptyState
					icon={Repeat}
					title="No recurring bills yet"
					description="Add a bill or subscription, or connect an account so we can find them."
					action={
						<Button type="button" onClick={() => setDrawer("new")}>
							Add recurring
						</Button>
					}
				/>
			);
		}
		return (
			<>
				<RecurringList title="Upcoming" items={active} onOpen={(item) => setDrawer(item.id)} />
				<RecurringList title="Inactive" items={inactive} onOpen={(item) => setDrawer(item.id)} />
			</>
		);
	}

	return (
		<>
			<PageHeader title="Recurring">
				<Button type="button" onClick={() => setDrawer("new")}>
					Add
				</Button>
			</PageHeader>
			<div className="flex flex-col gap-4">
				{data ? <RecurringSummary month={data} /> : null}
				<DetectedBanner candidates={found} />
				{content()}
			</div>
			{drawer === "new" ? <AddRecurringDrawer onClose={() => setDrawer(null)} /> : null}
			{openItem ? (
				<RecurringDrawer key={openItem.id} item={openItem} onClose={() => setDrawer(null)} />
			) : null}
		</>
	);
}
