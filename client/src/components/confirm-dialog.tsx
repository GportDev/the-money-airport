export function ConfirmDialog({
	title,
	onCancel,
	onConfirm,
	confirmLabel = "Delete",
}: {
	title: string;
	onCancel: () => void;
	onConfirm: () => void;
	confirmLabel?: string;
}) {
	return (
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		>
			<div className="w-full max-w-sm rounded-xl border border-border bg-card p-4">
				<h2 id="confirm-dialog-title" className="text-base font-semibold">
					{title}
				</h2>
				<div className="mt-4 flex justify-end gap-2">
					<button
						className="rounded-md border border-border px-3 py-2 text-sm"
						type="button"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						className="rounded-md bg-negative px-3 py-2 text-sm font-medium text-white"
						type="button"
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
