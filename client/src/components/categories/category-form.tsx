import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmojiSelect } from "@/components/ui/emoji-select";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import { DEFAULT_CATEGORY_EMOJI, toEmoji } from "@/lib/emoji-icon";
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

type Props = {
	/** The Category to edit, or null to create one. */
	category: Category | null;
	/** Prefills the name of a new Category. */
	initialName?: string;
	onSaved: (category: Category) => void;
	onCancel: () => void;
};

/** Create or edit form for one Category. */
export function CategoryForm({ category, initialName = "", onSaved, onCancel }: Props) {
	const create = useCreateCategory();
	const update = useUpdateCategory();
	const [name, setName] = useState(category?.name ?? initialName);
	const [color, setColor] = useState(category?.color ?? "#6B7280");
	const [icon, setIcon] = useState(category ? toEmoji(category.icon) : DEFAULT_CATEGORY_EMOJI);
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
			const saved = category
				? await update.mutateAsync({ id: category.id, ...body })
				: await create.mutateAsync(body);
			onSaved(saved);
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
				<div className="flex flex-col gap-1 text-sm">
					<span id="category-icon-label">Icon</span>
					<EmojiSelect aria-labelledby="category-icon-label" value={icon} onValueChange={setIcon} />
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
				<Button variant="outline" type="button" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</form>
	);
}
