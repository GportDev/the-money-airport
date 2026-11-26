import { Sparkline } from "@/components/accounts/sparkline";
import { Amount } from "@/components/ui/amount";
import { ShareBar } from "@/components/ui/share-bar";
import { formatMoney, formatSyncedAt } from "@/lib/format";
import type { BankAccount } from "@/types";

type Props = {
	account: BankAccount;
	/** Largest absolute balance in the group, for the share bar. */
	largest: number;
	onOpen: (account: BankAccount) => void;
};

/** One open account row: name with its share of the group, trend, credit use, balance. */
export function AccountRow({ account, largest, onOpen }: Props) {
	return (
		<button
			className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left text-sm row-hover sm:grid-cols-[minmax(0,1fr)_3rem_4rem_8rem]"
			type="button"
			onClick={() => onOpen(account)}
		>
			<span className="flex min-w-0 items-center gap-3">
				{account.institutionLogo ? (
					<img
						src={`data:image/png;base64,${account.institutionLogo}`}
						alt=""
						className="size-7 shrink-0 rounded-lg"
					/>
				) : null}
				<span className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="block truncate">
						{account.institutionName
							? `${account.institutionName} · ${account.name}`
							: account.name}
						{account.mask ? ` · ${account.mask}` : ""}
						{account.isHidden ? " (hidden)" : ""}
					</span>
					<ShareBar value={Math.abs(account.currentBalance)} max={largest} className="max-w-48" />
					{account.lastSyncedAt ? (
						<span className="text-xs text-muted-foreground">
							{formatSyncedAt(account.lastSyncedAt)}
						</span>
					) : null}
				</span>
			</span>
			{/* Trend and credit use, in fixed columns from sm up so rows line up. */}
			<span className="hidden sm:block">
				<Sparkline points={account.sparkline} />
			</span>
			<span className="hidden sm:block">
				{account.creditLimit ? (
					<ShareBar value={account.currentBalance} max={account.creditLimit} className="w-16" />
				) : null}
			</span>
			<Amount className="text-right">
				{formatMoney(account.currentBalance, account.isoCurrencyCode)}
			</Amount>
		</button>
	);
}
