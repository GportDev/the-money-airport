import { Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { AccountsSkeleton } from "@/components/accounts/accounts-skeleton";
import { Button } from "@/components/ui/button";
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
	onAdd: () => void;
	children: ReactNode;
};

/** Skeleton, error with retry, or the page; a first-account prompt sits above an empty list. */
export function AccountsState({ accounts, onAdd, children }: Props) {
	if (accounts.isPending) return <AccountsSkeleton />;
	if (accounts.isError) {
		return (
			<QueryError
				message="Could not load accounts."
				isRetrying={accounts.isFetching}
				onRetry={() => void accounts.refetch()}
			/>
		);
	}
	return (
		<>
			{accounts.data?.length === 0 ? (
				<EmptyState
					className="mb-6"
					icon={Landmark}
					title="No accounts yet"
					description="Connect a bank or add an account by hand to track your net worth."
					action={
						<Button type="button" onClick={onAdd}>
							Add your first account
						</Button>
					}
				/>
			) : null}
			{children}
		</>
	);
}
