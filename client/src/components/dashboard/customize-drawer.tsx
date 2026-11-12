import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { WIDGET_LABELS } from "@/components/dashboard/widgets";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useUpdateSettings } from "@/hooks/use-dashboard";
import type { DashboardWidget } from "@/types";

export function CustomizeDrawer({
	widgets,
	onClose,
}: {
	widgets: DashboardWidget[];
	onClose: () => void;
}) {
	const update = useUpdateSettings();
	const { sheet, close } = useSheetClose(onClose);
	const [draft, setDraft] = useState(() => [...widgets].sort((a, b) => a.order - b.order));
	const [error, setError] = useState<string | null>(null);

	function move(index: number, delta: number) {
		setDraft((current) => {
			const next = [...current];
			const target = index + delta;
			const from = next[index];
			const to = next[target];
			if (!from || !to) return current;
			next[index] = to;
			next[target] = from;
			return next;
		});
	}

	async function save() {
		setError(null);
		try {
			await update.mutateAsync({
				dashboardWidgets: draft.map((widget, order) => ({ ...widget, order })),
			});
			close();
		} catch {
			setError("Could not save. Try again.");
		}
	}

	return (
		<Sheet {...sheet}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Customize dashboard</SheetTitle>
					<SheetDescription>Choose which widgets show and in what order.</SheetDescription>
				</SheetHeader>
				<ol aria-label="Widgets" className="flex flex-col gap-1 px-4">
					{draft.map((widget, index) => {
						const label = WIDGET_LABELS[widget.id];
						return (
							<li
								key={widget.id}
								className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
							>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={widget.visible}
										onChange={(event) =>
											setDraft((current) =>
												current.map((row) =>
													row.id === widget.id ? { ...row, visible: event.target.checked } : row,
												),
											)
										}
									/>
									{label}
								</label>
								<span className="flex gap-1">
									<button
										type="button"
										className="rounded p-1 hover:bg-foreground/5 disabled:opacity-30"
										aria-label={`Move ${label} up`}
										disabled={index === 0}
										onClick={() => move(index, -1)}
									>
										<ArrowUp aria-hidden className="size-4" />
									</button>
									<button
										type="button"
										className="rounded p-1 hover:bg-foreground/5 disabled:opacity-30"
										aria-label={`Move ${label} down`}
										disabled={index === draft.length - 1}
										onClick={() => move(index, 1)}
									>
										<ArrowDown aria-hidden className="size-4" />
									</button>
								</span>
							</li>
						);
					})}
				</ol>
				{error ? (
					<p role="alert" className="px-4 text-sm text-negative">
						{error}
					</p>
				) : null}
				<div className="flex gap-2 px-4">
					<button
						type="button"
						className="flex-1 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
						onClick={() => close()}
					>
						Cancel
					</button>
					<button
						type="button"
						className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 transition-colors hover:bg-primary/85"
						disabled={update.isPending}
						onClick={() => void save()}
					>
						Save
					</button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
