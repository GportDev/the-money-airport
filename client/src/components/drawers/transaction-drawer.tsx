import { type FormEvent, useState } from "react";
import { useAccounts } from "../../hooks/use-accounts";
import { useCategories } from "../../hooks/use-categories";
import {
	useCreateTransaction,
	useTransaction,
	useUpdateTransaction,
} from "../../hooks/use-transactions";
import { cn } from "../../lib/cn";
import {
	centsToMajorUnits,
	formatLongDate,
	formatSignedMoney,
	majorUnitsToCents,
	todayIso,
} from "../../lib/format";
import type { Category, TransactionDetail } from "../../types";
import { CategoryIcon } from "../transactions/category-icon";
import { MerchantLogo } from "../transactions/merchant-logo";
import { Amount } from "../ui/amount";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "../ui/sheet";

const fieldClass = "rounded-md border border-border bg-card px-3 py-2";

/** `transactionId` null opens the add form; otherwise the detail/edit view. */
export function TransactionDrawer({
	transactionId,
	onClose,
	onDelete,
	onOpenSimilar,
}: {
	transactionId: string | null;
	onClose: () => void;
	onDelete?: (transaction: TransactionDetail) => void;
	onOpenSimilar?: (id: string) => void;
}) {
	const detail = useTransaction(transactionId);
	const categories = useCategories();
	return (
		<Sheet open onOpenChange={(next) => !next && onClose()}>
			<SheetContent side="right" className="overflow-y-auto">
				{transactionId === null ? (
					<AddForm categories={categories.data ?? []} onDone={onClose} />
				) : detail.data ? (
					<EditForm
						key={detail.data.id}
						transaction={detail.data}
						categories={categories.data ?? []}
						onDone={onClose}
						onDelete={onDelete}
						onOpenSimilar={onOpenSimilar}
					/>
				) : (
					<SheetHeader>
						<SheetTitle>Transaction</SheetTitle>
						<SheetDescription>
							{detail.isError ? "Could not load this Transaction." : "Loading…"}
						</SheetDescription>
					</SheetHeader>
				)}
			</SheetContent>
		</Sheet>
	);
}

function CategorySelect({
	id,
	value,
	onChange,
	categories,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	categories: Category[];
}) {
	const income = categories.filter((category) => category.kind === "income");
	const expense = categories.filter((category) => category.kind === "expense");
	return (
		<select
			id={id}
			className={fieldClass}
			value={value}
			onChange={(event) => onChange(event.target.value)}
		>
			<optgroup label="Expense">
				{expense.map((category) => (
					<option key={category.id} value={category.id}>
						{category.name}
					</option>
				))}
			</optgroup>
			<optgroup label="Income">
				{income.map((category) => (
					<option key={category.id} value={category.id}>
						{category.name}
					</option>
				))}
			</optgroup>
		</select>
	);
}

function EditForm({
	transaction,
	categories,
	onDone,
	onDelete,
	onOpenSimilar,
}: {
	transaction: TransactionDetail;
	categories: Category[];
	onDone: () => void;
	onDelete?: (transaction: TransactionDetail) => void;
	onOpenSimilar?: (id: string) => void;
}) {
	const update = useUpdateTransaction();
	const accounts = useAccounts();
	const [categoryId, setCategoryId] = useState(transaction.category?.id ?? "");
	const [notes, setNotes] = useState(transaction.notes ?? "");
	const [isTransfer, setIsTransfer] = useState(transaction.tags.length > 0);
	const [name, setName] = useState(transaction.name);
	const [amount, setAmount] = useState(centsToMajorUnits(transaction.amount));
	const [date, setDate] = useState(transaction.date);
	const [bankAccountId, setBankAccountId] = useState(transaction.account?.id ?? "");
	const [error, setError] = useState<string | null>(null);
	const title = transaction.merchantName ?? transaction.name;
	const wasTransfer = transaction.tags.length > 0;

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({
				id: transaction.id,
				...(categoryId !== transaction.category?.id ? { categoryId } : {}),
				notes: notes.trim() === "" ? null : notes,
				...(isTransfer !== wasTransfer ? { tags: isTransfer ? ["transfer"] : [] } : {}),
				...(transaction.isManual
					? {
							name,
							amount: majorUnitsToCents(amount),
							date,
							bankAccountId: bankAccountId === "" ? null : bankAccountId,
						}
					: {}),
			});
			onDone();
		} catch {
			setError("Could not save. Try again.");
		}
	}

	return (
		<>
			<SheetHeader>
				<div className="flex items-center gap-3 pr-6">
					<MerchantLogo name={title} url={transaction.merchantLogoUrl} />
					<div className="min-w-0">
						<SheetTitle className="truncate">{title}</SheetTitle>
						<SheetDescription>
							{formatLongDate(transaction.date)}
							{transaction.pending ? " · Pending" : ""}
						</SheetDescription>
					</div>
				</div>
				<Amount
					className={cn("pt-2 text-2xl font-semibold", transaction.amount > 0 && "text-positive")}
				>
					{formatSignedMoney(transaction.amount, transaction.isoCurrencyCode)}
				</Amount>
				<p className="text-sm text-muted-foreground">
					{transaction.account
						? `${transaction.account.name}${transaction.account.mask ? ` …${transaction.account.mask}` : ""}`
						: "Manual · no account"}
					{transaction.name !== title ? ` · ${transaction.name}` : ""}
				</p>
			</SheetHeader>
			<form className="flex flex-col gap-3 px-4" onSubmit={onSubmit}>
				{transaction.isManual ? (
					<>
						<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-name">
							Name
							<input
								id="transaction-name"
								className={fieldClass}
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-amount">
							Amount (negative for spend)
							<input
								id="transaction-amount"
								className={fieldClass}
								inputMode="decimal"
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-date">
							Date
							<input
								id="transaction-date"
								type="date"
								className={fieldClass}
								value={date}
								onChange={(event) => setDate(event.target.value)}
								required
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-account">
							Account
							<select
								id="transaction-account"
								className={fieldClass}
								value={bankAccountId}
								onChange={(event) => setBankAccountId(event.target.value)}
							>
								<option value="">No account</option>
								{(accounts.data ?? []).map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</label>
					</>
				) : null}
				<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-category">
					Category
					<CategorySelect
						id="transaction-category"
						value={categoryId}
						onChange={setCategoryId}
						categories={categories}
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm" htmlFor="transaction-notes">
					Notes
					<textarea
						id="transaction-notes"
						className={fieldClass}
						rows={3}
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
					/>
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={isTransfer}
						onChange={(event) => setIsTransfer(event.target.checked)}
					/>
					This is a transfer
				</label>
				<p className="text-xs text-muted-foreground">
					Transfers move money between your own accounts and are left out of income and spending.
				</p>
				{error ? (
					<p role="alert" className="text-sm text-negative">
						{error}
					</p>
				) : null}
				<button
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
					type="submit"
					disabled={update.isPending}
				>
					Save
				</button>
			</form>
			{transaction.similar.length > 0 ? (
				<section aria-labelledby="similar-heading" className="flex flex-col gap-2 px-4">
					<h3 id="similar-heading" className="text-sm font-medium">
						Similar transactions
					</h3>
					<ul className="flex flex-col">
						{transaction.similar.map((item) => (
							<li key={item.id}>
								<button
									type="button"
									className="flex w-full items-center justify-between gap-2 border-b border-border py-2 text-left text-sm"
									onClick={() => onOpenSimilar?.(item.id)}
								>
									<span className="flex min-w-0 items-center gap-2">
										{item.category ? (
											<CategoryIcon icon={item.category.icon} color={item.category.color} />
										) : null}
										<span className="truncate">{formatLongDate(item.date)}</span>
									</span>
									<Amount className={cn(item.amount > 0 && "text-positive")}>
										{formatSignedMoney(item.amount, item.isoCurrencyCode)}
									</Amount>
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
			{transaction.isManual && onDelete ? (
				<SheetFooter>
					<button
						className="rounded-md border border-border px-3 py-2 text-sm text-negative"
						type="button"
						onClick={() => onDelete(transaction)}
					>
						Delete transaction
					</button>
				</SheetFooter>
			) : null}
		</>
	);
}

function AddForm({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
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
		<>
			<SheetHeader>
				<SheetTitle>Add transaction</SheetTitle>
				<SheetDescription>Record cash or anything your banks do not report.</SheetDescription>
			</SheetHeader>
			<form className="flex flex-col gap-3 px-4" onSubmit={onSubmit}>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-name">
					Name
					<input
						id="new-transaction-name"
						className={fieldClass}
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</label>
				<fieldset className="flex gap-4 text-sm">
					<legend className="sr-only">Direction</legend>
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="direction"
							checked={direction === "expense"}
							onChange={() => setDirection("expense")}
						/>
						Spend
					</label>
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="direction"
							checked={direction === "income"}
							onChange={() => setDirection("income")}
						/>
						Income
					</label>
				</fieldset>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-amount">
					Amount
					<input
						id="new-transaction-amount"
						className={fieldClass}
						inputMode="decimal"
						placeholder="0.00"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						required
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-date">
					Date
					<input
						id="new-transaction-date"
						type="date"
						className={fieldClass}
						value={date}
						onChange={(event) => setDate(event.target.value)}
						required
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-account">
					Account
					<select
						id="new-transaction-account"
						className={fieldClass}
						value={bankAccountId}
						onChange={(event) => setBankAccountId(event.target.value)}
					>
						<option value="">No account</option>
						{(accounts.data ?? []).map((account) => (
							<option key={account.id} value={account.id}>
								{account.name}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-category">
					Category
					<CategorySelect
						id="new-transaction-category"
						value={categoryId || uncategorized?.id || ""}
						onChange={setCategoryId}
						categories={categories}
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm" htmlFor="new-transaction-notes">
					Notes
					<textarea
						id="new-transaction-notes"
						className={fieldClass}
						rows={2}
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
					/>
				</label>
				{error ? (
					<p role="alert" className="text-sm text-negative">
						{error}
					</p>
				) : null}
				<button
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
					type="submit"
					disabled={create.isPending}
				>
					Add
				</button>
			</form>
		</>
	);
}
