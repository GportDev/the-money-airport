import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateStatement } from "@/hooks/use-liabilities";
import { majorUnitsToCents } from "@/lib/format";

type Props = {
	accountId: string;
	onDone: () => void;
};

const FIELDS = [
	{ id: "statement-start", label: "Period start", type: "date" },
	{ id: "statement-end", label: "Close date", type: "date" },
	{ id: "statement-balance", label: "Statement balance", type: "number" },
	{ id: "statement-minimum", label: "Minimum payment", type: "number" },
	{ id: "statement-due", label: "Due date", type: "date" },
] as const;

type FieldId = (typeof FIELDS)[number]["id"];

/** A Statement entered by hand when Plaid has none. */
export function ManualStatementForm({ accountId, onDone }: Props) {
	const create = useCreateStatement();
	const [values, setValues] = useState<Record<FieldId, string>>({
		"statement-start": "",
		"statement-end": "",
		"statement-balance": "",
		"statement-minimum": "",
		"statement-due": "",
	});

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		const minimum = values["statement-minimum"].trim();
		try {
			await create.mutateAsync({
				accountId,
				periodStart: values["statement-start"],
				periodEnd: values["statement-end"],
				statementBalance: majorUnitsToCents(values["statement-balance"]),
				minimumPayment: minimum === "" ? null : majorUnitsToCents(minimum),
				dueDate: values["statement-due"] || null,
			});
			toast.success("Statement added");
			onDone();
		} catch (_error) {
			toast.error("Could not add the statement");
		}
	}

	return (
		<form className="grid grid-cols-2 gap-3 text-sm" onSubmit={onSubmit} aria-label="New statement">
			{FIELDS.map((field) => (
				<label key={field.id} className="flex flex-col gap-1" htmlFor={field.id}>
					{field.label}
					<Input
						id={field.id}
						type={field.type}
						step={field.type === "number" ? "0.01" : undefined}
						min={field.type === "number" ? "0" : undefined}
						required={field.id !== "statement-minimum" && field.id !== "statement-due"}
						value={values[field.id]}
						onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}
					/>
				</label>
			))}
			<Button type="submit" disabled={create.isPending} className="col-span-2 self-start">
				Add statement
			</Button>
		</form>
	);
}
