import { TransactionAddForm } from "@/components/drawers/transaction/transaction-add-form";
import { TransactionEdit } from "@/components/drawers/transaction/transaction-edit";
import { QueryError } from "@/components/ui/query-error";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import { useTransaction } from "@/hooks/use-transactions";
import type { TransactionDetail } from "@/types";

/** `transactionId` null opens the add form; otherwise the detail view, edited in place. */
export function TransactionDrawer({
	transactionId,
	onClose,
	onDelete,
	onOpenSimilar,
	onChanged,
}: {
	transactionId: string | null;
	onClose: () => void;
	onDelete?: (transaction: TransactionDetail) => void;
	onOpenSimilar?: (id: string) => void;
	onChanged?: (id: string) => void;
}) {
	const detail = useTransaction(transactionId);
	const categories = useCategories();
	const { sheet, close } = useSheetClose(onClose);
	return (
		<Sheet {...sheet}>
			<SheetContent className="overflow-y-auto pb-4">
				{transactionId === null ? (
					<TransactionAddForm categories={categories.data ?? []} onDone={() => close()} />
				) : detail.data ? (
					<TransactionEdit
						key={detail.data.id}
						transaction={detail.data}
						onDelete={onDelete}
						onOpenSimilar={onOpenSimilar}
						onChanged={onChanged}
					/>
				) : (
					<>
						<SheetHeader>
							<SheetTitle>Transaction</SheetTitle>
							<SheetDescription className="sr-only">Transaction detail</SheetDescription>
						</SheetHeader>
						{detail.isError ? (
							<QueryError
								className="mx-4"
								message="Could not load this Transaction."
								isRetrying={detail.isFetching}
								onRetry={() => void detail.refetch()}
							/>
						) : (
							<TransactionDetailSkeleton />
						)}
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

function TransactionDetailSkeleton() {
	return (
		<SkeletonGroup label="Loading transaction" className="flex flex-col gap-4 px-4">
			<Skeleton className="h-8 w-32" />
			<Skeleton className="h-3 w-1/2" />
			{["category", "notes", "account"].map((field) => (
				<Skeleton key={field} className="h-9 w-full" />
			))}
		</SkeletonGroup>
	);
}
