import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/transactions/category-icon";
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

const fieldClass =
	"rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30";
const BUDGET_GROUPS: { key: BudgetGroup; label: string }[] = [
	{ key: "fixed", label: "Fixed" },
	{ key: "flexible", label: "Flexible" },
	{ key: "non_monthly", label: "Non-monthly" },
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
							Deleting a Category moves its transactions to Uncategorized.
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
							<button
								className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
								type="button"
								onClick={() => setEditing("new")}
							>
								New category
							</button>
						)}
						{(["expense", "income"] as const).map((kind) => (
							<section key={kind} aria-labelledby={`categories-${kind}`}>
								<h3 id={`categories-${kind}`} className="mb-1 text-sm font-medium capitalize">
									{kind}
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
			budgetGroup: kind === "income" ? null : budgetGroup,
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
				<input
					id="category-name"
					className={fieldClass}
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
				<label className="flex flex-1 flex-col gap-1 text-sm" htmlFor="category-icon">
					Icon
					<select
						id="category-icon"
						className={fieldClass}
						value={icon}
						onChange={(event) => setIcon(event.target.value)}
					>
						{Object.keys(CATEGORY_ICONS).map((key) => (
							<option key={key} value={key}>
								{key}
							</option>
						))}
					</select>
				</label>
			</div>
			{category?.isUncategorized ? null : (
				<label className="flex flex-col gap-1 text-sm" htmlFor="category-kind">
					Kind
					<select
						id="category-kind"
						className={fieldClass}
						value={kind}
						onChange={(event) => setKind(event.target.value as CategoryKind)}
					>
						<option value="expense">Expense</option>
						<option value="income">Income</option>
					</select>
				</label>
			)}
			{kind === "expense" ? (
				<label className="flex flex-col gap-1 text-sm" htmlFor="category-budget-group">
					Budget group
					<select
						id="category-budget-group"
						className={fieldClass}
						value={budgetGroup}
						onChange={(event) => setBudgetGroup(event.target.value as BudgetGroup)}
					>
						{BUDGET_GROUPS.map((group) => (
							<option key={group.key} value={group.key}>
								{group.label}
							</option>
						))}
					</select>
				</label>
			) : null}
			{error ? (
				<p role="alert" className="text-sm text-negative">
					{error}
				</p>
			) : null}
			<div className="flex gap-2">
				<button
					className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					type="submit"
				>
					{category ? "Save category" : "Create category"}
				</button>
				<button
					className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
					type="button"
					onClick={onDone}
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
