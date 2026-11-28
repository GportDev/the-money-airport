import { Input } from "@/components/ui/input";

export type StatementDraft = {
	periodStart: string;
	periodEnd: string;
	statementBalance: string;
	minimumPayment: string;
	dueDate: string;
};

type Props = {
	draft: StatementDraft;
	onChange: (draft: StatementDraft) => void;
};

const FIELDS = [
	{ key: "periodStart", label: "Period start", type: "date" },
	{ key: "periodEnd", label: "Close date", type: "date" },
	{ key: "statementBalance", label: "Statement balance", type: "number" },
	{ key: "minimumPayment", label: "Minimum payment", type: "number" },
	{ key: "dueDate", label: "Due date", type: "date" },
] as const;

/** The Statement read from the file; the User fills in what the file leaves out. */
export function StatementFieldsForm({ draft, onChange }: Props) {
	return (
		<fieldset aria-label="Statement" className="grid grid-cols-2 gap-3 text-sm">
			{FIELDS.map((field) => (
				<label
					key={field.key}
					className="flex flex-col gap-1"
					htmlFor={`statement-import-${field.key}`}
				>
					{field.label}
					<Input
						id={`statement-import-${field.key}`}
						type={field.type}
						step={field.type === "number" ? "0.01" : undefined}
						min={field.type === "number" ? "0" : undefined}
						required={field.key !== "minimumPayment" && field.key !== "dueDate"}
						value={draft[field.key]}
						onChange={(event) => onChange({ ...draft, [field.key]: event.target.value })}
					/>
				</label>
			))}
		</fieldset>
	);
}
