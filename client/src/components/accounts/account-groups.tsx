import { useState } from "react";
import { formatMoney, formatSyncedAt } from "../../lib/format";
import { type BankAccount, DISPLAY_GROUPS, type GroupSummary } from "../../types";
import { Amount } from "../ui/amount";
import { Sparkline } from "./sparkline";

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
				const expanded = open[group.key] !== false;
				const change = summary?.change ?? 0;
				return (
					<section key={group.key} aria-labelledby={headingId}>
						<div className="flex items-center justify-between gap-2 px-3">
							<h2 id={headingId} className="text-sm font-semibold">
								<button
									type="button"
									className="text-left underline-offset-4 hover:underline"
									aria-expanded={expanded}
									onClick={() => setOpen((current) => ({ ...current, [group.key]: !expanded }))}
								>
									{group.label}
								</button>
							</h2>
							<span className="flex items-center gap-2 text-sm text-muted-foreground">
								<Amount>{formatMoney(summary?.total ?? 0, baseCurrency)}</Amount>
								{change !== 0 ? (
									<span>
										{change > 0 ? "+" : ""}
										{formatMoney(change, baseCurrency)}
									</span>
								) : null}
							</span>
						</div>
						{expanded ? (
							rows.length === 0 ? (
								<p className="text-sm text-muted-foreground">None</p>
							) : (
								<ul className="mt-2 flex flex-col gap-2">
									{rows.map((account) => (
										<li key={account.id}>
											<button
												className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-foreground/5 sm:grid-cols-[minmax(0,1fr)_3rem_4rem_8rem]"
												type="button"
												onClick={() => onOpen(account)}
											>
												<span className="flex min-w-0 items-center gap-2">
													{account.institutionLogo ? (
														<img
															src={`data:image/png;base64,${account.institutionLogo}`}
															alt=""
															className="size-6 rounded-sm"
														/>
													) : null}
													<span className="min-w-0">
														<span className="block truncate">
															{account.institutionName
																? `${account.institutionName} · ${account.name}`
																: account.name}
															{account.mask ? ` · ${account.mask}` : ""}
															{account.isHidden ? " (hidden)" : ""}
														</span>
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
														<span className="block h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
															<span
																className="block h-full bg-primary"
																style={{
																	width: `${Math.min(100, (account.currentBalance / account.creditLimit) * 100)}%`,
																}}
															/>
														</span>
													) : null}
												</span>
												<Amount className="text-right">
													{formatMoney(account.currentBalance, account.isoCurrencyCode)}
												</Amount>
											</button>
										</li>
									))}
								</ul>
							)
						) : null}
					</section>
				);
			})}
		</div>
	);
}
