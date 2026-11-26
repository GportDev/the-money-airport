import { ChevronDown } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatMoney } from "@/lib/format";
import type { BankAccount } from "@/types";

type Props = {
	accounts: { account: BankAccount }[];
};

/** Liabilities turned out of the debt plan; Payback skips them. */
export function NotInPlan({ accounts }: Props) {
	if (accounts.length === 0) return null;
	return (
		<Collapsible asChild>
			<section aria-label="Not in plan" className="rounded-xl border border-border bg-card">
				<CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium row-hover">
					<ChevronDown
						aria-hidden
						className="size-4 transition-transform group-data-[state=closed]:-rotate-90"
					/>
					Not in plan ({accounts.length})
				</CollapsibleTrigger>
				<CollapsibleContent>
					<ul className="divide-y divide-border border-t border-border">
						{accounts.map(({ account }) => (
							<li key={account.id} className="flex justify-between px-3 py-2 text-sm">
								<span>{account.name}</span>
								<Amount>{formatMoney(account.currentBalance, account.isoCurrencyCode)}</Amount>
							</li>
						))}
					</ul>
				</CollapsibleContent>
			</section>
		</Collapsible>
	);
}
