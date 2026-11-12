import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

/**
 * Side drawer built on Base UI's Drawer: slides in from the right, swipe right or press
 * Escape to dismiss, click outside to close. No dimmed backdrop.
 *
 * Callers usually mount a drawer with `open` and unmount it in `onOpenChange(false)`. To let
 * the exit slide play first, `onOpenChange(false)` fires from `onOpenChangeComplete`, once
 * Base UI has finished the closing transition.
 */
function Sheet({
	open = true,
	onOpenChange,
	children,
}: {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}) {
	// Start closed and open after mount so the entering slide plays.
	const [shown, setShown] = useState(false);
	useEffect(() => {
		setShown(open);
	}, [open]);

	return (
		<Drawer.Root
			swipeDirection="right"
			open={shown}
			onOpenChange={(next) => {
				setShown(next);
				if (next) onOpenChange?.(true);
			}}
			onOpenChangeComplete={(next) => {
				if (!next) onOpenChange?.(false);
			}}
		>
			{children}
		</Drawer.Root>
	);
}

/**
 * For drawers that close themselves (Save, Cancel, Done): `close()` slides the drawer out,
 * then calls `after` (or `onClosed`) once it is gone. Spread `sheet` onto `<Sheet>`.
 */
function useSheetClose(onClosed: () => void) {
	const [open, setOpen] = useState(true);
	const after = useRef<(() => void) | null>(null);
	return {
		sheet: {
			open,
			onOpenChange: (next: boolean) => {
				if (next) return;
				const then = after.current ?? onClosed;
				after.current = null;
				then();
			},
		},
		close: (then?: () => void) => {
			after.current = then ?? null;
			setOpen(false);
		},
	};
}

function SheetTrigger(props: React.ComponentProps<typeof Drawer.Trigger>) {
	return <Drawer.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof Drawer.Close>) {
	return <Drawer.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
	className,
	children,
	showCloseButton = true,
	...props
}: Omit<React.ComponentProps<typeof Drawer.Popup>, "className"> & {
	className?: string;
	showCloseButton?: boolean;
}) {
	return (
		<Drawer.Portal>
			<Drawer.Viewport className="pointer-events-none fixed inset-0 z-50 flex justify-end">
				<Drawer.Popup
					data-slot="sheet-content"
					className={cn(
						"pointer-events-auto relative flex h-full w-3/4 flex-col border-l border-border bg-background shadow-2xl outline-none sm:max-w-sm",
						// Base UI's side-drawer recipe: follow the finger while swiping, slide fully
						// out on enter/exit, and finish a flick at the speed it was thrown.
						"[transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
						"data-[swiping]:select-none data-[starting-style]:[transform:translateX(calc(100%+2px))] data-[ending-style]:[transform:translateX(calc(100%+2px))] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*300ms)]",
						"motion-reduce:transition-none",
						className,
					)}
					{...props}
				>
					<Drawer.Content className="flex min-h-0 flex-1 flex-col gap-4">{children}</Drawer.Content>
					{showCloseButton ? (
						<Drawer.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
							<XIcon className="size-4" />
							<span className="sr-only">Close</span>
						</Drawer.Close>
					) : null}
				</Drawer.Popup>
			</Drawer.Viewport>
		</Drawer.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 p-4", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: Omit<React.ComponentProps<typeof Drawer.Title>, "className"> & { className?: string }) {
	return (
		<Drawer.Title
			data-slot="sheet-title"
			className={cn("font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: Omit<React.ComponentProps<typeof Drawer.Description>, "className"> & {
	className?: string;
}) {
	return (
		<Drawer.Description
			data-slot="sheet-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
	useSheetClose,
};
