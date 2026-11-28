import { Popover } from "@base-ui/react/popover";
import {
	EmojiPicker,
	type EmojiPickerListCategoryHeaderProps,
	type EmojiPickerListEmojiProps,
	type EmojiPickerListRowProps,
} from "frimousse";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
	value: string;
	onValueChange: (emoji: string) => void;
	id?: string;
	"aria-labelledby"?: string;
	className?: string;
};

const PICKER_COLUMNS = 9;

function EmojiCategoryHeader({
	category,
	className,
	...props
}: EmojiPickerListCategoryHeaderProps) {
	return (
		<div
			className={cn(
				"bg-card px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground",
				className,
			)}
			{...props}
		>
			{category.label}
		</div>
	);
}

function EmojiRow({ className, children, ...props }: EmojiPickerListRowProps) {
	return (
		<div className={cn("scroll-my-1.5 px-1.5", className)} {...props}>
			{children}
		</div>
	);
}

function EmojiButton({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
	return (
		<button
			className={cn(
				"flex size-8 items-center justify-center rounded-md text-lg transition-colors data-[active]:bg-foreground/5",
				className,
			)}
			{...props}
		>
			{emoji.emoji}
		</button>
	);
}

/**
 * Emoji picker in a popover: every emoji the device can draw, searchable, with skin tones.
 * Emoji data loads from the Emojibase CDN on first open and is cached by frimousse.
 */
export function EmojiSelect({
	value,
	onValueChange,
	id,
	"aria-labelledby": labelledBy,
	className,
}: Props) {
	const [isOpen, setOpen] = useState(false);

	return (
		<Popover.Root open={isOpen} onOpenChange={setOpen}>
			<Popover.Trigger
				id={id}
				aria-labelledby={labelledBy}
				className={cn(
					"flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:border-border-strong",
					className,
				)}
			>
				<span className="text-lg leading-none">{value}</span>
				<ChevronDown aria-hidden className="size-4 text-muted-foreground" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
					<Popover.Popup
						aria-label="Emoji"
						className="origin-(--transform-origin) overflow-hidden rounded-lg border border-border bg-card shadow-pop outline-none data-[open]:animate-pop-in"
					>
						<EmojiPicker.Root
							columns={PICKER_COLUMNS}
							onEmojiSelect={({ emoji }) => {
								onValueChange(emoji);
								setOpen(false);
							}}
							className="isolate flex h-[22rem] max-h-(--available-height) w-fit flex-col"
						>
							<div className="flex items-center gap-2 border-b border-border p-2">
								<EmojiPicker.Search
									aria-label="Search emoji"
									placeholder="Search emoji"
									className="min-w-0 flex-1 appearance-none rounded-md bg-muted px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
								/>
								<EmojiPicker.SkinToneSelector
									aria-label="Change skin tone"
									className="flex size-8 shrink-0 items-center justify-center rounded-md text-lg transition-colors hover:bg-foreground/5"
								/>
							</div>
							<EmojiPicker.Viewport className="relative flex-1 outline-none">
								<EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
									Loading emoji…
								</EmojiPicker.Loading>
								<EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
									No emoji match.
								</EmojiPicker.Empty>
								<EmojiPicker.List
									className="pb-1.5 select-none"
									components={{
										CategoryHeader: EmojiCategoryHeader,
										Row: EmojiRow,
										Emoji: EmojiButton,
									}}
								/>
							</EmojiPicker.Viewport>
						</EmojiPicker.Root>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
