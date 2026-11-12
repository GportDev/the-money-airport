export function BudgetColumnLabels() {
	return (
		<div aria-hidden className="hidden justify-end px-3 text-xs text-muted-foreground sm:flex">
			<span className="grid w-80 grid-cols-3 gap-3 text-right">
				<span>Planned</span>
				<span>Actual</span>
				<span>Remaining</span>
			</span>
		</div>
	);
}
