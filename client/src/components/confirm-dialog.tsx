import { Button } from "@/components/ui/button";
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
			className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-foreground/40 p-4"
		>
			<div className="w-full max-w-sm animate-pop-in rounded-xl border border-border bg-card p-4">
				<h2 id="confirm-dialog-title" className="text-base font-semibold">
					{title}
				</h2>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="outline" type="button" onClick={onCancel}>
						Cancel
					</Button>
					<Button variant="danger" type="button" onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
