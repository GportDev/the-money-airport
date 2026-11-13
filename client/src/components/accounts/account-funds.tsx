import { FundBalanceList } from "@/components/goals/fund-balance-list";
import type { BankAccount } from "@/types";

type Props = { account: BankAccount };

export function AccountFunds({ account }: Props) {
	return (
		<section aria-labelledby="account-funds-heading" className="flex flex-col gap-2 px-4 pb-4">
			<h3 id="account-funds-heading" className="text-sm font-medium">
				Funds
			</h3>
			<FundBalanceList
				funds={account.funds}
				unassigned={account.unassigned ?? 0}
				currency={account.isoCurrencyCode}
			/>
		</section>
	);
}
