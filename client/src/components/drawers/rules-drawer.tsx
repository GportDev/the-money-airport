import { toast } from "sonner";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { QueryError } from "@/components/ui/query-error";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";
import { useDeleteTransactionRule, useTransactionRules } from "@/hooks/use-transaction-rules";
import { centsToMajorUnits } from "@/lib/format";

export function RulesDrawer({ onClose }: { onClose: () => void }) {
	const rules = useTransactionRules();
	const remove = useDeleteTransactionRule();
	const { sheet } = useSheetClose(onClose);

	return (
		<Sheet {...sheet}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Rules</SheetTitle>
					<SheetDescription>
						Rules file transactions by merchant, and by amount when set. Create one from a
						transaction.
					</SheetDescription>
				</SheetHeader>
				<div className="px-4 pb-6">
					{rules.isPending ? (
						<SkeletonGroup label="Loading rules">
							<SkeletonRows count={3} />
						</SkeletonGroup>
					) : rules.isError ? (
						<QueryError
							message="Could not load rules."
							isRetrying={rules.isFetching}
							onRetry={() => void rules.refetch()}
						/>
					) : rules.data.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No rules yet. Open a transaction and create one.
						</p>
					) : (
						<ul className="flex flex-col">
							{rules.data.map((rule) => (
								<li
									key={rule.id}
									className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"
								>
									<span className="flex min-w-0 flex-col">
										<span className="truncate font-medium">
											{rule.merchant}
											{rule.amount !== null ? ` · amount ${centsToMajorUnits(rule.amount)}` : ""}
										</span>
										<span className="flex items-center gap-1 text-muted-foreground">
											<CategoryIcon icon={rule.category.icon} color={rule.category.color} />
											{rule.category.name}
										</span>
									</span>
									<button
										type="button"
										className="text-xs text-negative underline-offset-4 hover:underline"
										aria-label={`Delete rule for ${rule.merchant}`}
										disabled={remove.isPending}
										onClick={() =>
											remove.mutate(rule.id, {
												onSuccess: () => toast.success("Rule deleted"),
												onError: () => toast.error("Could not delete the rule"),
											})
										}
									>
										Delete
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
