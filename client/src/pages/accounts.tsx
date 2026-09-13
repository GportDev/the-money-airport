import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { disconnectItem, syncAll } from "../api/plaid";
import { AccountGroups } from "../components/accounts/account-groups";
import { ConnectPlaidButton } from "../components/accounts/connect-plaid-button";
import { NetWorthHero } from "../components/accounts/net-worth-hero";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AccountDrawer } from "../components/drawers/account-drawer";
import { PageHeader } from "../components/layout/page-header";
import {
	useAccounts,
	useCreateAccount,
	useDeleteAccount,
	useNetWorth,
	useUpdateAccount,
} from "../hooks/use-accounts";
import { isUnofficialCurrency } from "../lib/format";
import { type BankAccount, DISPLAY_GROUPS } from "../types";

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
				<button
					className="rounded-md border border-border px-3 py-2 text-sm"
					type="button"
					onClick={() => setFiltersOpen(true)}
				>
					Filters
				</button>
				<button
					className="rounded-md border border-border px-3 py-2 text-sm"
					type="button"
					onClick={() => {
						void syncAll().then(() => queryClient.invalidateQueries({ queryKey: ["accounts"] }));
					}}
				>
					Refresh all
				</button>
				<button
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
					type="button"
					onClick={() => setChooser(true)}
				>
					Add account
				</button>
			</PageHeader>
			<div className="flex flex-col gap-6">
				{omitted ? (
					<output className="rounded-md border border-border bg-card px-3 py-2 text-sm">
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
			{filtersOpen ? (
				<div
					role="dialog"
					aria-label="Filters"
					className="fixed inset-y-0 right-0 left-16 z-40 flex items-start justify-end bg-black/20 p-6 pt-24 xl:left-60"
				>
					<div className="flex w-72 flex-col gap-3 rounded-xl border border-border bg-card p-4">
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
						<label className="flex flex-col gap-1 text-sm">
							Group
							<select
								className="rounded-md border border-border bg-card px-3 py-2"
								value={groupFilter ?? "all"}
								onChange={(event) => {
									patchParams((params) => {
										if (event.target.value === "all") {
											params.delete("group");
										} else {
											params.set("group", event.target.value);
										}
									});
								}}
							>
								<option value="all">All</option>
								{DISPLAY_GROUPS.map((group) => (
									<option key={group.key} value={group.key}>
										{group.label}
									</option>
								))}
							</select>
						</label>
						<button
							className="rounded-md border border-border px-3 py-2 text-sm"
							type="button"
							onClick={() => setFiltersOpen(false)}
						>
							Done
						</button>
					</div>
				</div>
			) : null}
			{chooser ? (
				<div
					role="dialog"
					aria-label="Add account"
					className="fixed inset-y-0 right-0 left-16 z-40 flex items-start justify-end bg-black/20 p-6 pt-24 xl:left-60"
				>
					<div className="flex w-72 flex-col gap-2 rounded-xl border border-border bg-card p-4">
						<ConnectPlaidButton onDone={() => setChooser(false)} />
						<button
							className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
							type="button"
							onClick={() => {
								setChooser(false);
								setDrawer("create");
							}}
						>
							Add manually
						</button>
					</div>
				</div>
			) : null}
			{drawer !== "closed" ? (
				<AccountDrawer
					key={drawer === "create" ? "create" : drawer.id}
					open
					account={drawer === "create" ? null : drawer}
					onClose={() => setDrawer("closed")}
					onSave={async (input) => {
						if (drawer === "create") {
							await create.mutateAsync(input);
						} else {
							await update.mutateAsync({
								id: drawer.id,
								name: input.name,
								currentBalance: input.currentBalance,
								creditLimit: input.creditLimit,
								isHidden: input.isHidden,
							});
						}
						setDrawer("closed");
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
						void queryClient.invalidateQueries({ queryKey: ["accounts"] });
						setDrawer("closed");
					}}
				/>
			) : null}
			{pendingDelete ? (
				<ConfirmDialog
					title={`Delete ${pendingDelete.name}?`}
					onCancel={() => setPendingDelete(null)}
					onConfirm={() => {
						void remove.mutateAsync(pendingDelete.id).then(() => setPendingDelete(null));
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
						void disconnectItem(pendingDisconnect.plaidItemId).then(() => {
							void queryClient.invalidateQueries({ queryKey: ["accounts"] });
							setPendingDisconnect(null);
						});
					}}
				/>
			) : null}
		</>
	);
}
