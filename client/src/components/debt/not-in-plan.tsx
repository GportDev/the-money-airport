import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { BankAccount } from "@/types";

type Props = {
	accounts: { account: BankAccount }[];
};

/** Liabilities turned out of the debt plan; Payback skips them. */
export function NotInPlan({ accounts }: Props) {
	if (accounts.length === 0) return null;
	return (
		<Collapsible.Root asChild>
			<section aria-label="Not in plan" className="rounded-xl border border-border bg-card">
				<Collapsible.Trigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-foreground/5">
					<ChevronDown
						aria-hidden
						className="size-4 transition-transform group-data-[state=closed]:-rotate-90"
					/>
					Not in plan ({accounts.length})
				</Collapsible.Trigger>
				<Collapsible.Content>
					<ul className="divide-y divide-border border-t border-border">
						{accounts.map(({ account }) => (
							<li key={account.id} className="flex justify-between px-3 py-2 text-sm">
								<span>{account.name}</span>
								<Amount>{formatMoney(account.currentBalance, account.isoCurrencyCode)}</Amount>
							</li>
						))}
					</ul>
				</Collapsible.Content>
			</section>
		</Collapsible.Root>
	);
}
