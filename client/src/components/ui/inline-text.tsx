import { cva, type VariantProps } from "class-variance-authority";
import { useRef } from "react";
import { SavingIndicator } from "@/components/ui/saving-indicator";
import { useInlineCommit } from "@/hooks/use-inline-commit";
import { cn } from "@/lib/cn";

const inlineTextVariants = cva(
	"w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-muted-foreground hover:border-border hover:bg-foreground/[0.02] focus-visible:border-border focus-visible:bg-card focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:hover:border-transparent",
	{
		variants: {
			size: {
				title: "text-xl font-semibold tracking-tight",
				amount: "amount text-[28px] leading-tight",
				body: "text-sm",
			},
		},
		defaultVariants: { size: "body" },
	},
);

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange" | "size"> &
	VariantProps<typeof inlineTextVariants> & {
		value: string;
		onCommit: (next: string) => Promise<unknown> | unknown;
		/** Required fields revert when cleared; set this to save an empty value. */
		allowEmpty?: boolean;
	};

/** Text that is its own input: plain at rest, a soft field on hover and focus, saved on Enter or blur. */
export function InlineText({
	value,
	onCommit,
	allowEmpty = false,
	size,
	className,
	...props
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const field = useInlineCommit({ value, onCommit, allowEmpty });
	return (
		<span className="relative flex min-w-0 items-center">
			<input
				ref={inputRef}
				value={field.draft}
				onChange={(event) => field.setDraft(event.target.value)}
				onBlur={() => void field.commit()}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						inputRef.current?.blur();
					}
					if (event.key === "Escape") {
						event.stopPropagation();
						field.revert();
						requestAnimationFrame(() => inputRef.current?.blur());
					}
				}}
				className={cn(inlineTextVariants({ size }), field.isSaving && "pr-7", className)}
				{...props}
			/>
			{field.isSaving ? <SavingIndicator className="absolute right-2" /> : null}
		</span>
	);
}
