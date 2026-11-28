import { useState } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useCategories, useDeleteCategory } from "@/hooks/use-categories";
import type { Category, CategoryKind } from "@/types";

const KIND_SECTIONS: { kind: CategoryKind; label: string }[] = [
	{ kind: "expense", label: "Expense" },
	{ kind: "income", label: "Income" },
	{ kind: "transfer", label: "Transfer" },
];

export function CategoryManagerDrawer({ onClose }: { onClose: () => void }) {
	const categories = useCategories();
	const remove = useDeleteCategory();
	const [editing, setEditing] = useState<Category | "new" | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
	const rows = categories.data ?? [];

	return (
		<>
			{/* The Sheet is modal, so it steps aside while the confirm is up. */}
			<Sheet open={!pendingDelete} onOpenChange={(next) => !next && !pendingDelete && onClose()}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Categories</SheetTitle>
						<SheetDescription>
							Deleting a Category moves its transactions to Uncategorized. Transfer categories mark
							money moving between your own accounts: it is not income or spending.
						</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col gap-4 px-4 pb-6">
						{editing ? (
							<CategoryForm
								key={editing === "new" ? "new" : editing.id}
								category={editing === "new" ? null : editing}
								onSaved={() => setEditing(null)}
								onCancel={() => setEditing(null)}
							/>
						) : (
							<Button type="button" onClick={() => setEditing("new")}>
								New category
							</Button>
						)}
						{KIND_SECTIONS.map(({ kind, label }) => (
							<section key={kind} aria-labelledby={`categories-${kind}`}>
								<h3 id={`categories-${kind}`} className="mb-1 text-sm font-medium">
									{label}
								</h3>
								<ul className="flex flex-col">
									{rows
										.filter((row) => row.kind === kind)
										.map((row) => (
											<li
												key={row.id}
												className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"
											>
												<button
													type="button"
													className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-primary"
													onClick={() => setEditing(row)}
												>
													<CategoryIcon icon={row.icon} color={row.color} />
													<span className="truncate">{row.name}</span>
												</button>
												{row.isUncategorized ? (
													<span className="text-xs text-muted-foreground">Built in</span>
												) : (
													<button
														type="button"
														className="text-xs text-negative underline-offset-4 hover:underline"
														aria-label={`Delete ${row.name}`}
														onClick={() => setPendingDelete(row)}
													>
														Delete
													</button>
												)}
											</li>
										))}
								</ul>
							</section>
						))}
					</div>
				</SheetContent>
			</Sheet>
			{pendingDelete ? (
				<ConfirmDialog
					title={`Delete ${pendingDelete.name}? Its transactions move to Uncategorized.`}
					onCancel={() => setPendingDelete(null)}
					onConfirm={() => {
						void remove.mutateAsync(pendingDelete.id).finally(() => setPendingDelete(null));
					}}
				/>
			) : null}
		</>
	);
}
