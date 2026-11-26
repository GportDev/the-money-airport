import { Combobox } from "@base-ui/react/combobox";
import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMerchants, useUpdateTransaction } from "@/hooks/use-transactions";
import { defaultTitleEdit, type TitleEdit, titleEditOptions } from "@/lib/title-edit";
import type { TransactionListItem } from "@/types";

type Title = { name: string; merchantName: string | null };

/**
 * A feed row's title, with a pencil that swaps it for a merchant-or-name editor. The title text
 * lets clicks fall through to the row, so clicking it still opens the drawer.
 */
export function FeedTitleEditor({
	item,
	isEditable,
}: {
	item: TransactionListItem;
	isEditable: boolean;
}) {
	const [isEditing, setEditing] = useState(false);
	const update = useUpdateTransaction();
	const title = item.merchantName ?? item.name;

	function apply(edit: TitleEdit) {
		setEditing(false);
		const body =
			edit.kind === "rename"
				? { name: edit.value }
				: { merchantName: edit.kind === "remove" ? null : edit.value };
		update.mutate(
			{ id: item.id, ...body },
			{ onError: () => toast.error(`Could not update ${title}`) },
		);
	}

	if (isEditing) {
		return (
			<TitleCombobox
				current={{ name: item.name, merchantName: item.merchantName }}
				initial={title}
				onApply={apply}
				onCancel={() => setEditing(false)}
			/>
		);
	}
	// The raw bank text only earns a second line when it says more than the merchant does.
	const showsRawName =
		item.merchantName !== null && item.merchantName.toLowerCase() !== item.name.toLowerCase();
	return (
		<>
			<span className="pointer-events-none flex min-w-16 flex-col">
				<span className="truncate">{title}</span>
				{showsRawName ? (
					<span className="truncate text-xs text-muted-foreground">{item.name}</span>
				) : null}
			</span>
			{isEditable ? (
				<button
					type="button"
					aria-label="Edit name or merchant"
					onClick={() => setEditing(true)}
					className="row-action relative inline-flex max-sm:hidden size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
				>
					<Pencil aria-hidden className="size-3.5" />
				</button>
			) : null}
		</>
	);
}

function TitleCombobox({
	current,
	initial,
	onApply,
	onCancel,
}: {
	current: Title;
	initial: string;
	onApply: (edit: TitleEdit) => void;
	onCancel: () => void;
}) {
	const merchants = useMerchants();
	const [query, setQuery] = useState(initial);
	const highlighted = useRef<TitleEdit | undefined>(undefined);
	const names = (merchants.data ?? []).map((merchant) => merchant.name);
	const items = titleEditOptions(query, names, current);

	return (
		<Combobox.Root<TitleEdit>
			items={items}
			filter={null}
			defaultOpen
			value={null}
			inputValue={query}
			onInputValueChange={setQuery}
			itemToStringLabel={(edit) => edit.label}
			onItemHighlighted={(edit) => {
				highlighted.current = edit;
			}}
			onValueChange={(edit) => {
				if (edit) onApply(edit);
			}}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<Combobox.Input
				aria-label="Merchant or name"
				autoFocus
				onFocus={(event) => event.currentTarget.select()}
				onKeyDown={(event) => {
					if (event.key !== "Enter" || highlighted.current) return;
					event.preventDefault();
					const edit = defaultTitleEdit(query, current.merchantName !== null);
					if (edit) onApply(edit);
					else onCancel();
				}}
				className="relative h-8 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-sm shadow-float outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
			/>
			<Combobox.Portal>
				<Combobox.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
					<Combobox.Popup
						aria-label="Merchant or name"
						className="flex max-h-[min(20rem,var(--available-height))] w-72 origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border border-border bg-card p-1 text-sm shadow-pop data-[open]:animate-pop-in"
					>
						<Combobox.Empty className="px-2 py-1.5 text-muted-foreground empty:hidden">
							Type a merchant or a new name.
						</Combobox.Empty>
						<Combobox.List className="empty:hidden">
							{(edit: TitleEdit) => (
								<Combobox.Item
									key={`${edit.kind}:${edit.value}`}
									value={edit}
									className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors select-none data-[highlighted]:bg-foreground/5"
								>
									<span className="flex-1 truncate">{edit.label}</span>
									{edit.kind === "merchant" && edit.label === edit.value ? (
										<span className="text-xs text-muted-foreground">Merchant</span>
									) : null}
								</Combobox.Item>
							)}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
}
