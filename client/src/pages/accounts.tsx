import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { disconnectItem, syncAll } from "@/api/plaid";
import { AccountGroups } from "@/components/accounts/account-groups";
import { AccountsState } from "@/components/accounts/accounts-state";
import { ConnectPlaidButton } from "@/components/accounts/connect-plaid-button";
import { NetWorthHero } from "@/components/accounts/net-worth-hero";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AccountDrawer } from "@/components/drawers/account-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectField } from "@/components/ui/select-field";
import {
	useAccounts,
	useCreateAccount,
	useDeleteAccount,
	useNetWorth,
	useUpdateAccount,
} from "@/hooks/use-accounts";
import { isUnofficialCurrency } from "@/lib/format";
import { invalidateLedger } from "@/lib/invalidate";
import { type BankAccount, DISPLAY_GROUPS } from "@/types";

export function AccountsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const range = searchParams.get("range") ?? "1m";
	const hiddenFilter = searchParams.get("hidden") === "omit";
	const groupFilter = searchParams.get("group");
	const accounts = useAccounts();
	const netWorth = useNetWorth(range);
	const create = useCreateAccount();
	const update = useUpdateAccount();
	const remove = useDeleteAccount();
	const queryClient = useQueryClient();
	const [drawer, setDrawer] = useState<"closed" | "create" | BankAccount>("closed");
	const [chooser, setChooser] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<BankAccount | null>(null);
	const [pendingDisconnect, setPendingDisconnect] = useState<BankAccount | null>(null);

	const rows = (accounts.data ?? []).filter((row) => {
		if (hiddenFilter && row.isHidden) {
			return false;
		}
		if (groupFilter && row.displayGroup !== groupFilter) {
			return false;
		}
		return true;
	});
	const omitted = (accounts.data ?? []).some(
		(row) => !row.isHidden && isUnofficialCurrency(row.isoCurrencyCode),
	);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		const nextParams = new URLSearchParams(searchParams);
		mutate(nextParams);
		setSearchParams(nextParams);
	}

	return (
		<>
			<PageHeader title="Accounts">
				<Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
					<PopoverTrigger asChild>
						<Button variant="outline" type="button">
							Filters
						</Button>
					</PopoverTrigger>
					<PopoverContent aria-label="Filters">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={!hiddenFilter}
								onChange={(event) => {
									patchParams((params) => {
										if (event.target.checked) {
											params.delete("hidden");
										} else {
											params.set("hidden", "omit");
										}
									});
								}}
							/>
							Show hidden
						</label>
						<div className="flex flex-col gap-1 text-sm">
							<label htmlFor="accounts-group-filter">Group</label>
							<SelectField
								id="accounts-group-filter"
								value={groupFilter ?? "all"}
								options={[
									{ value: "all", label: "All" },
									...DISPLAY_GROUPS.map((group) => ({ value: group.key, label: group.label })),
								]}
								onValueChange={(value) => {
									patchParams((params) => {
										if (value === "all") {
											params.delete("group");
										} else {
											params.set("group", value);
										}
									});
								}}
							/>
						</div>
						<Button variant="outline" type="button" onClick={() => setFiltersOpen(false)}>
							Done
						</Button>
					</PopoverContent>
				</Popover>
				<Button
					variant="outline"
					type="button"
					onClick={() => {
						toast.promise(
							syncAll().then(() => invalidateLedger(queryClient)),
							{
								loading: "Refreshing accounts…",
								success: "Accounts refreshed",
								error: "Could not refresh accounts",
							},
						);
					}}
				>
					Refresh all
				</Button>
				<Popover open={chooser} onOpenChange={setChooser}>
					<PopoverTrigger asChild>
						<Button type="button">Add account</Button>
					</PopoverTrigger>
					{/* Plaid Link opens in its own iframe; moving focus there must not close this and
					    unmount the Link handler before it reports back. */}
					<PopoverContent
						aria-label="Add account"
						className="gap-2"
						onFocusOutside={(event) => event.preventDefault()}
					>
						<ConnectPlaidButton onDone={() => setChooser(false)} />
						<Button
							type="button"
							onClick={() => {
								setChooser(false);
								setDrawer("create");
							}}
						>
							Add manually
						</Button>
					</PopoverContent>
				</Popover>
			</PageHeader>
			<AccountsState accounts={accounts} onAdd={() => setChooser(true)}>
				<div className="flex flex-col gap-6">
					{omitted ? (
						<output className="rounded-lg bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground">
							Unofficial currencies are omitted from net worth.
						</output>
					) : null}
					<NetWorthHero
						netWorth={netWorth.data}
						range={range}
						onRangeChange={(next) => {
							patchParams((params) => params.set("range", next));
						}}
					/>
					<AccountGroups
						accounts={rows}
						groups={netWorth.data?.groups ?? []}
						baseCurrency={netWorth.data?.baseCurrency ?? "USD"}
						onOpen={(account) => setDrawer(account)}
					/>
				</div>
			</AccountsState>
			{drawer !== "closed" ? (
				<AccountDrawer
					key={drawer === "create" ? "create" : drawer.id}
					open
					account={drawer === "create" ? null : drawer}
					range={range}
					onClose={() => setDrawer("closed")}
					onSave={async (input) => {
						if (drawer === "create") {
							await create.mutateAsync(input);
						} else {
							await update.mutateAsync({
								id: drawer.id,
								name: input.name,
								currentBalance: input.currentBalance,
								...(drawer.displayGroup === "credit" ? { creditLimit: input.creditLimit } : {}),
								isHidden: input.isHidden,
								apyBps: input.apyBps,
								inCashPlan: input.inCashPlan,
								inDebtPlan: input.inDebtPlan,
							});
						}
					}}
					onDelete={
						drawer === "create"
							? undefined
							: () => {
									setPendingDelete(drawer);
									setDrawer("closed");
								}
					}
					onDisconnect={
						drawer === "create" || !drawer.plaidItemId
							? undefined
							: () => {
									setPendingDisconnect(drawer);
									setDrawer("closed");
								}
					}
					onReconnected={() => {
						void invalidateLedger(queryClient);
						setDrawer("closed");
					}}
				/>
			) : null}
			{pendingDelete ? (
				<ConfirmDialog
					title={`Delete ${pendingDelete.name}?`}
					onCancel={() => setPendingDelete(null)}
					onConfirm={() => {
						toast.promise(remove.mutateAsync(pendingDelete.id), {
							success: "Account deleted",
							error: "Could not delete the account",
						});
						setPendingDelete(null);
					}}
				/>
			) : null}
			{pendingDisconnect ? (
				<ConfirmDialog
					title="Disconnect this PlaidItem? History is kept."
					confirmLabel="Disconnect"
					onCancel={() => setPendingDisconnect(null)}
					onConfirm={() => {
						if (!pendingDisconnect.plaidItemId) {
							setPendingDisconnect(null);
							return;
						}
						toast.promise(
							disconnectItem(pendingDisconnect.plaidItemId).then(() =>
								invalidateLedger(queryClient),
							),
							{ success: "Disconnected. History is kept.", error: "Could not disconnect" },
						);
						setPendingDisconnect(null);
					}}
				/>
			) : null}
		</>
	);
}
