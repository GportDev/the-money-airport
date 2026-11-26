import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AccountRow } from "@/components/accounts/account-row";
import { Amount } from "@/components/ui/amount";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatMoney } from "@/lib/format";
import { type BankAccount, DISPLAY_GROUPS, type GroupSummary } from "@/types";

export function AccountGroups({
	accounts,
	groups,
	baseCurrency,
	onOpen,
}: {
	accounts: BankAccount[];
	groups: GroupSummary[];
	baseCurrency: string;
	onOpen: (account: BankAccount) => void;
}) {
	const [open, setOpen] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(DISPLAY_GROUPS.map((group) => [group.key, true])),
	);

	return (
		<div className="flex flex-col gap-4">
			{DISPLAY_GROUPS.map((group) => {
				const rows = accounts.filter((account) => account.displayGroup === group.key);
				const headingId = `group-${group.key}`;
				const summary = groups.find((item) => item.group === group.key);
				const change = summary?.change ?? 0;
				const largest = Math.max(0, ...rows.map((account) => Math.abs(account.currentBalance)));
				return (
					<Collapsible
						key={group.key}
						open={open[group.key] !== false}
						onOpenChange={(next) => setOpen((current) => ({ ...current, [group.key]: next }))}
						asChild
					>
						<section
							aria-labelledby={headingId}
							className="rounded-xl border border-border bg-card"
						>
							<div className="flex items-center justify-between gap-2 px-4 py-3">
								<h2 id={headingId} className="text-[15px] font-semibold">
									<CollapsibleTrigger className="group inline-flex items-center gap-1.5 rounded-md text-left">
										<ChevronDown
											aria-hidden
											className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
										/>
										{group.label}
									</CollapsibleTrigger>
								</h2>
								<span className="flex items-baseline gap-2 text-sm">
									<Amount>{formatMoney(summary?.total ?? 0, baseCurrency)}</Amount>
									{change !== 0 ? (
										<Amount className={change > 0 ? "text-positive" : "text-negative"}>
											{change > 0 ? "+" : ""}
											{formatMoney(change, baseCurrency)}
										</Amount>
									) : null}
								</span>
							</div>
							<CollapsibleContent>
								{rows.length === 0 ? (
									<p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
										None
									</p>
								) : (
									<ul className="flex flex-col divide-y divide-border border-t border-border px-1 py-1">
										{rows.map((account) => (
											<li key={account.id}>
												<AccountRow account={account} largest={largest} onOpen={onOpen} />
											</li>
										))}
									</ul>
								)}
							</CollapsibleContent>
						</section>
					</Collapsible>
				);
			})}
		</div>
	);
}
