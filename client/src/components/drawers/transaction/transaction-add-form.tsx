import { type FormEvent, useState } from "react";
import { CategoryCombobox } from "@/components/transactions/category-combobox";
import { Button } from "@/components/ui/button";
import { inlineFieldVariants } from "@/components/ui/inline-text";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { cn } from "@/lib/cn";
import { majorUnitsToCents, todayIso } from "@/lib/format";
import type { Category } from "@/types";

const DIRECTIONS = [
	{ value: "expense", label: "Spend" },
	{ value: "income", label: "Income" },
] as const;

type Props = { categories: Category[]; onDone: () => void };

/** Records cash or anything the banks do not report; one explicit Add at the end. */
export function TransactionAddForm({ categories, onDone }: Props) {
	const create = useCreateTransaction();
	const accounts = useAccounts();
	const uncategorized = categories.find((category) => category.isUncategorized);
	const [name, setName] = useState("");
	const [direction, setDirection] = useState<"expense" | "income">("expense");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(todayIso());
	const [categoryId, setCategoryId] = useState("");
	const [bankAccountId, setBankAccountId] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		const cents = Math.abs(majorUnitsToCents(amount));
		if (!Number.isFinite(cents) || cents === 0) {
			setError("Enter an amount.");
			return;
		}
		try {
			await create.mutateAsync({
				name,
				amount: direction === "expense" ? -cents : cents,
				date,
				categoryId: categoryId === "" ? null : categoryId,
				bankAccountId: bankAccountId === "" ? null : bankAccountId,
				notes: notes.trim() === "" ? null : notes,
			});
			onDone();
		} catch {
			setError("Could not add. Try again.");
		}
	}

	return (
		<form className="flex flex-1 flex-col gap-4" onSubmit={onSubmit}>
			<SheetHeader className="gap-1 pr-12">
				<SheetTitle>
					<input
						aria-label="Name"
						placeholder="Transaction name"
						// biome-ignore lint/a11y/noAutofocus: the drawer opens to type a name.
						autoFocus
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={cn(inlineFieldVariants({ size: "title" }), "-ml-2")}
					/>
				</SheetTitle>
				<SheetDescription>Record cash or anything your banks do not report.</SheetDescription>
			</SheetHeader>
			<div className="-mt-2 flex flex-col gap-2 px-4">
				<div className="flex items-center gap-3">
					<input
						aria-label="Amount"
						inputMode="decimal"
						placeholder="0.00"
						required
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						className={cn(inlineFieldVariants({ size: "amount" }), "-ml-2 flex-1")}
					/>
					<Segmented
						aria-label="Direction"
						size="sm"
						value={direction}
						options={DIRECTIONS}
						onValueChange={setDirection}
					/>
				</div>
				<textarea
					aria-label="Notes"
					placeholder="Add a note…"
					rows={1}
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					className={cn(inlineFieldVariants({ size: "note" }), "-ml-2")}
				/>
			</div>
			<PropertyList className="mx-4">
				<PropertyRow label="Category">
					<CategoryCombobox
						aria-label="Category"
						value={categoryId || uncategorized?.id || null}
						onValueChange={setCategoryId}
						className="-ml-2 h-8 w-full rounded-lg px-2 transition-colors hover:bg-foreground/5"
					/>
				</PropertyRow>
				<PropertyRow label="Account">
					<SelectField
						aria-label="Account"
						variant="ghost"
						className="-ml-2.5 w-full [&>span:first-child]:font-normal"
						value={bankAccountId}
						options={[
							{ value: "", label: "No account" },
							...(accounts.data ?? []).map((account) => ({
								value: account.id,
								label: account.name,
							})),
						]}
						onValueChange={setBankAccountId}
					/>
				</PropertyRow>
				<PropertyRow label="Date">
					<input
						aria-label="Date"
						type="date"
						required
						value={date}
						onChange={(event) => setDate(event.target.value)}
						className={cn(inlineFieldVariants({ size: "body" }), "-ml-2 h-8")}
					/>
				</PropertyRow>
			</PropertyList>
			{error ? (
				<p role="alert" className="px-4 text-sm text-negative">
					{error}
				</p>
			) : null}
			<div className="mt-auto px-4 pb-4">
				<Button type="submit" className="w-full" disabled={create.isPending}>
					{create.isPending ? "Adding…" : "Add transaction"}
				</Button>
			</div>
		</form>
	);
}
