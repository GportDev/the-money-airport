import { PieChart } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { useSettleClass } from "@/hooks/use-settle-class";
import type { BankAccount } from "@/types";

type Props = {
	accounts: {
		data: BankAccount[] | undefined;
		isPending: boolean;
		isError: boolean;
		isFetching: boolean;
		refetch: () => unknown;
	};
	children: ReactNode;
};

/** Reports need at least one account; until then point the User to Accounts. */
export function ReportsState({ accounts, children }: Props) {
	const settle = useSettleClass(accounts.isPending);
	if (accounts.isPending) return <ReportsSkeleton />;
	if (accounts.isError) {
		return (
			<QueryError
				message="Could not load reports."
				isRetrying={accounts.isFetching}
				onRetry={() => void accounts.refetch()}
			/>
		);
	}
	if (accounts.data?.length === 0) {
		return (
			<EmptyState
				icon={PieChart}
				title="No accounts yet"
				description="Add an account to see spending, income, and balances over time."
				action={
					<Button asChild>
						<Link to="/accounts">Go to Accounts</Link>
					</Button>
				}
			/>
		);
	}
	return <div className={settle}>{children}</div>;
}
