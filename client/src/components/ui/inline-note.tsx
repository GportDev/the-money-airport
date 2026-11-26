import { useRef } from "react";
import { inlineFieldVariants } from "@/components/ui/inline-text";
import { SavingIndicator } from "@/components/ui/saving-indicator";
import { useInlineCommit } from "@/hooks/use-inline-commit";
import { cn } from "@/lib/cn";

type Props = Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & {
	value: string;
	onCommit: (next: string) => Promise<unknown> | unknown;
};

/** A quiet, auto-growing note: placeholder at rest, saved on blur or Cmd/Ctrl+Enter. */
export function InlineNote({ value, onCommit, className, placeholder, ...props }: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const field = useInlineCommit({ value, onCommit, allowEmpty: true });
	return (
		<span className="relative block">
			<textarea
				ref={ref}
				rows={1}
				value={field.draft}
				placeholder={placeholder ?? "Add a note…"}
				onChange={(event) => field.setDraft(event.target.value)}
				onBlur={() => void field.commit()}
				onKeyDown={(event) => {
					if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
						event.preventDefault();
						ref.current?.blur();
					}
					if (event.key === "Escape") {
						event.stopPropagation();
						field.revert();
						requestAnimationFrame(() => ref.current?.blur());
					}
				}}
				className={cn(inlineFieldVariants({ size: "note" }), "block", className)}
				{...props}
			/>
			{field.isSaving ? <SavingIndicator className="absolute top-2 right-2" /> : null}
		</span>
	);
}
