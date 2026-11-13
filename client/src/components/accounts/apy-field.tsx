type Props = {
	value: string;
	onChange: (value: string) => void;
};

export function ApyField({ value, onChange }: Props) {
	return (
		<label className="flex flex-col gap-1 text-sm" htmlFor="account-apy">
			APY (%)
			<input
				id="account-apy"
				className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
				type="number"
				inputMode="decimal"
				min="0"
				max="1000"
				step="0.01"
				placeholder="4.25"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</label>
	);
}
