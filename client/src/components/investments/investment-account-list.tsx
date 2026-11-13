import { Sparkline } from "@/components/accounts/sparkline";
import { SignedChange } from "@/components/investments/signed-change";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { InvestmentAccount } from "@/types";

type Props = { accounts: InvestmentAccount[]; total: number };

function shareLabel(account: InvestmentAccount, total: number) {
	if (account.value === null || total === 0) return "—";
	return `${Math.round((account.value / total) * 100)}%`;
}

export function InvestmentAccountList({ accounts, total }: Props) {
	return (
		<ul
			aria-label="Investment accounts"
			className="divide-y divide-border rounded-xl border border-border bg-card"
		>
			{accounts.map((account) => (
				<li
					key={account.id}
					className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_6rem_3rem_9rem_9rem]"
				>
					<div className="min-w-0">
						<p className="truncate font-medium">{account.name}</p>
						<p className="truncate text-xs text-muted-foreground">
							{account.institutionName ?? (account.source === "manual" ? "Manual" : "")}
							{account.mask ? ` …${account.mask}` : ""}
						</p>
					</div>
					<span className="hidden sm:block">
						<Sparkline points={account.sparkline} width={96} height={24} />
					</span>
					<span className="hidden text-right text-xs text-muted-foreground sm:block">
						{shareLabel(account, total)}
					</span>
					<Amount className="text-right">
						{formatMoney(account.currentBalance, account.isoCurrencyCode)}
					</Amount>
					<SignedChange
						cents={account.change}
						currency={account.isoCurrencyCode}
						className="col-span-2 text-right sm:col-span-1"
					/>
				</li>
			))}
		</ul>
	);
}
