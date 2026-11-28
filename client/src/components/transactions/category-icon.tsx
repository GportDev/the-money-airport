import { cn } from "@/lib/cn";
import { toEmoji } from "@/lib/emoji-icon";

type Props = {
	icon: string;
	color: string;
	className?: string;
};

/** The Category (or Goal) emoji on a soft chip of its color. */
export function CategoryIcon({ icon, color, className }: Props) {
	return (
		// The emoji is drawn from data-emoji in CSS so it stays out of the text around it (row
		// names, picker values), the way the old SVG icons did.
		<span
			aria-hidden
			data-emoji={toEmoji(icon)}
			className={cn(
				"inline-flex size-5 shrink-0 items-center justify-center rounded-md text-xs leading-none before:content-[attr(data-emoji)]",
				className,
			)}
			// Inline style: the chip tint is the user's Category color.
			style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
		/>
	);
}
