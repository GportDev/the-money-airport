import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { CategoryIconSelect } from "@/components/transactions/category-icon-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	useCategories,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory,
} from "@/hooks/use-categories";
import type { BudgetGroup, Category, CategoryKind } from "@/types";

const BUDGET_GROUPS: { key: BudgetGroup; label: string }[] = [
	{ key: "fixed", label: "Fixed" },
	{ key: "flexible", label: "Flexible" },
	{ key: "non_monthly", label: "Non-monthly" },
];

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
	{ value: "transfer", label: "Transfer" },
];

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
								onDone={() => setEditing(null)}
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

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
	const create = useCreateCategory();
	const update = useUpdateCategory();
	const [name, setName] = useState(category?.name ?? "");
	const [color, setColor] = useState(category?.color ?? "#6B7280");
	const [icon, setIcon] = useState(category?.icon ?? "circle");
	const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
	const [budgetGroup, setBudgetGroup] = useState<BudgetGroup>(category?.budgetGroup ?? "flexible");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		const body = {
			name,
			color,
			icon,
			kind,
			budgetGroup: kind === "expense" ? budgetGroup : null,
		};
		try {
			if (category) {
				await update.mutateAsync({ id: category.id, ...body });
			} else {
				await create.mutateAsync(body);
			}
			onDone();
		} catch {
			setError("Could not save. The name may already be taken.");
		}
	}

	return (
		<form
			className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3"
			onSubmit={onSubmit}
		>
			<label className="flex flex-col gap-1 text-sm" htmlFor="category-name">
				Name
				<Input
					id="category-name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					required
				/>
			</label>
			<div className="flex gap-3">
				<label className="flex flex-col gap-1 text-sm" htmlFor="category-color">
					Color
					<input
						id="category-color"
						type="color"
						className="h-10 w-14 rounded-md border border-border bg-card"
						value={color}
						onChange={(event) => setColor(event.target.value)}
					/>
				</label>
				<div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
					<span id="category-icon-label">Icon</span>
					<CategoryIconSelect
						labelId="category-icon-label"
						value={icon}
						color={color}
						onValueChange={setIcon}
					/>
				</div>
			</div>
			{category?.isUncategorized ? null : (
				<div className="flex flex-col gap-1 text-sm">
					<label htmlFor="category-kind">Kind</label>
					<SelectField
						id="category-kind"
						value={kind}
						options={KIND_OPTIONS}
						onValueChange={setKind}
					/>
				</div>
			)}
			{kind === "expense" ? (
				<div className="flex flex-col gap-1 text-sm">
					<label htmlFor="category-budget-group">Budget group</label>
					<SelectField
						id="category-budget-group"
						value={budgetGroup}
						options={BUDGET_GROUPS.map((group) => ({ value: group.key, label: group.label }))}
						onValueChange={setBudgetGroup}
					/>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="text-sm text-negative">
					{error}
				</p>
			) : null}
			<div className="flex gap-2">
				<Button className="flex-1" type="submit">
					{category ? "Save category" : "Create category"}
				</Button>
				<Button variant="outline" type="button" onClick={onDone}>
					Cancel
				</Button>
			</div>
		</form>
	);
}
