import { PieChart } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
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
					<Link
						to="/accounts"
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					>
						Go to Accounts
					</Link>
				}
			/>
		);
	}
	return children;
}
