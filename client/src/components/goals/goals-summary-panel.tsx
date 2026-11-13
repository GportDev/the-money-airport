import { useSearchParams } from "react-router";
import { FundBalanceList } from "@/components/goals/fund-balance-list";
import { Amount } from "@/components/ui/amount";
import { useGoals } from "@/hooks/use-goals";
import { formatMoney } from "@/lib/format";
import { GOAL_EDIT_ACCOUNTS_PARAM, GOAL_EDIT_ACCOUNTS_VALUE, parseGoalTab } from "@/lib/goals";

/** Right panel: the BankAccounts behind this tab's Goals, and each Fund host's split. */
export function GoalsSummaryPanel() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = parseGoalTab(searchParams.get("tab"));
	const goals = useGoals(tab);
	const accounts = (goals.data?.goals ?? []).flatMap((goal) => goal.accounts);
	const hosts = tab === "save_up" ? (goals.data?.hosts ?? []) : [];

	function openEditAccounts() {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			next.set(GOAL_EDIT_ACCOUNTS_PARAM, GOAL_EDIT_ACCOUNTS_VALUE);
			return next;
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<section aria-label="Goal accounts" className="flex flex-col gap-2">
				<h2 className="text-sm font-medium">Accounts</h2>
				{accounts.length === 0 ? (
					<p className="text-sm text-muted-foreground">No accounts on these goals yet.</p>
				) : (
					<ul className="flex flex-col text-sm">
						{accounts.map((account) => (
							<li key={account.id} className="flex justify-between gap-2 py-1">
								<span className="truncate">{account.name}</span>
								<Amount>{formatMoney(account.currentBalance, account.isoCurrencyCode)}</Amount>
							</li>
						))}
					</ul>
				)}
			</section>
			{hosts.map((host) => (
				<section key={host.id} aria-label={host.name} className="flex flex-col gap-2">
					<h2 className="flex justify-between text-sm font-medium">
						<span>{host.name}</span>
						<Amount>{formatMoney(host.balance, host.isoCurrencyCode)}</Amount>
					</h2>
					<FundBalanceList
						funds={host.funds}
						unassigned={host.unassigned}
						currency={host.isoCurrencyCode}
					/>
				</section>
			))}
			<button
				type="button"
				onClick={openEditAccounts}
				className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
			>
				Edit accounts
			</button>
		</div>
	);
}
