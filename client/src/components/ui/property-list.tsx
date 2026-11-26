import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";

/** One bordered card of label/value rows; the value slot holds text or an inline control. */
function PropertyList({ className, children, ...props }: React.ComponentProps<"dl">) {
	return (
		<dl
			className={cn(
				"flex flex-col divide-y divide-border rounded-xl border border-border bg-card text-sm",
				className,
			)}
			{...props}
		>
			{children}
		</dl>
	);
}

type RowProps = {
	label: ReactNode;
	/** Renders the value with the label's id so an inline control can use `aria-labelledby`. */
	children: ReactNode | ((labelId: string) => ReactNode);
	className?: string;
};

function PropertyRow({ label, children, className }: RowProps) {
	const labelId = useId();
	return (
		<div
			className={cn(
				"grid min-h-10 grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 px-3 py-1",
				className,
			)}
		>
			<dt id={labelId} className="flex items-center gap-1 text-muted-foreground">
				{label}
			</dt>
			<dd className="flex min-w-0 items-center">
				{typeof children === "function" ? children(labelId) : children}
			</dd>
		</div>
	);
}

export { PropertyList, PropertyRow };
