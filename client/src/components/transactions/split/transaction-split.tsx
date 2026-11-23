import { Split } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { SplitEditor } from "@/components/transactions/split/split-editor";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { formatSignedMoney } from "@/lib/format";
import type { TransactionDetail } from "@/types";

type Props = { transaction: TransactionDetail };

/** Drawer section: the parts of a split Transaction and the way into the split editor. */
export function TransactionSplit({ transaction }: Props) {
	const [isEditing, setIsEditing] = useState(false);
	const split = transaction.split;

	return (
		<section aria-labelledby="split-heading" className="flex flex-col gap-2 px-4">
			<div className="flex items-center justify-between gap-2">
				<h3 id="split-heading" className="text-sm font-medium">
					{split ? `Split into ${split.parts.length} parts` : "Split"}
				</h3>
				{isEditing ? null : (
					<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
						<Split aria-hidden className="size-3.5" />
						{split ? "Edit split" : "Split transaction"}
					</Button>
				)}
			</div>
			{isEditing ? (
				<SplitEditor transaction={transaction} onDone={() => setIsEditing(false)} />
			) : split ? (
				<ul className="flex flex-col text-sm">
					{split.parts.map((part) => (
						<li
							key={part.id}
							className="flex items-center justify-between gap-2 border-b border-border py-1.5"
							aria-current={part.id === transaction.id ? "true" : undefined}
						>
							<span className="flex min-w-0 items-center gap-2">
								{part.category ? (
									<CategoryIcon icon={part.category.icon} color={part.category.color} />
								) : null}
								<span className="truncate">{part.category?.name ?? "Uncategorized"}</span>
								{part.id === transaction.id ? (
									<span className="text-xs text-muted-foreground">This part</span>
								) : null}
							</span>
							<Amount>{formatSignedMoney(part.amount, transaction.isoCurrencyCode)}</Amount>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
