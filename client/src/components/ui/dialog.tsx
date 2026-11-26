import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// CONVENTION-DEVIATION: Base UI Dialog rather than Radix, so Base UI comboboxes inside it (the
// split editor's Category pickers) stay part of its focus and dismiss tree.
const Dialog = DialogPrimitive.Root;
const DialogClose = DialogPrimitive.Close;

/** Centered modal for quick, single-purpose actions launched from a list row. */
function DialogContent({
	className,
	children,
	...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & { className?: string }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
			<DialogPrimitive.Popup
				className={cn(
					"fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-pop outline-none",
					"transition-[opacity,scale] duration-160 ease-out data-[ending-style]:scale-(--pop-scale) data-[ending-style]:opacity-0 data-[ending-style]:duration-100 data-[starting-style]:scale-(--pop-scale) data-[starting-style]:opacity-0",
					className,
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close
					className={cn(
						buttonVariants({ variant: "ghost", size: "icon-sm" }),
						"absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground",
					)}
				>
					<XIcon aria-hidden className="size-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Popup>
		</DialogPrimitive.Portal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}

function DialogTitle({
	className,
	...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Title>, "className"> & { className?: string }) {
	return <DialogPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />;
}

function DialogDescription({
	className,
	...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Description>, "className"> & {
	className?: string;
}) {
	return (
		<DialogPrimitive.Description
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle };
