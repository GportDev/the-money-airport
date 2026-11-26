import { Ellipsis } from "lucide-react";
import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineText } from "@/components/ui/inline-text";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatLongDate } from "@/lib/format";
import type { TransactionDetail } from "@/types";

type MenuItem = { label: string; onSelect: () => void; isDanger?: boolean };

type Props = {
	transaction: TransactionDetail;
	onRename: (name: string) => Promise<unknown>;
	menu: MenuItem[];
};

/**
 * Logo, title, date and status, and the overflow menu. The title is the merchant when there is
 * one (edited in the property card); otherwise it is the name, edited right here.
 */
export function TransactionHeader({ transaction, onRename, menu }: Props) {
	const logoName = transaction.merchantName ?? transaction.name;
	return (
		<SheetHeader className="gap-1 pr-12">
			<div className="flex items-center gap-2">
				<MerchantLogo name={logoName} url={transaction.merchantLogoUrl} />
				<SheetTitle className="min-w-0 flex-1">
					{transaction.merchantName ? (
						<span className="block truncate text-xl font-semibold tracking-tight">
							{transaction.merchantName}
						</span>
					) : (
						<InlineText
							aria-label="Name"
							size="title"
							value={transaction.name}
							onCommit={onRename}
							className="-ml-2"
						/>
					)}
				</SheetTitle>
				{menu.length > 0 ? <OverflowMenu items={menu} /> : null}
			</div>
			<SheetDescription className="flex items-center gap-2">
				{formatLongDate(transaction.date)}
				{transaction.pending ? <Badge>Pending</Badge> : <span>· Posted</span>}
			</SheetDescription>
		</SheetHeader>
	);
}

function OverflowMenu({ items }: { items: MenuItem[] }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="More actions"
					className="text-muted-foreground"
				>
					<Ellipsis aria-hidden className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{items.map((item) => (
					<DropdownMenuItem
						key={item.label}
						onSelect={item.onSelect}
						className={item.isDanger ? "text-negative" : undefined}
					>
						{item.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
