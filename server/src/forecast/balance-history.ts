export type AccountRole = "cash" | "card" | "savings" | "loan";

export type RoleTotals = Record<AccountRole, number>;

export type HistoryAccount = { id: string; role: AccountRole; rate: number };

export type Snapshot = { bankAccountId: string; date: string; balance: number };

/**
 * Reads past balances from end-of-day snapshots: each BankAccount counts at its latest snapshot on
 * or before the date, converted to Base. Null when no BankAccount had a snapshot yet.
 */
export function historyReader(snapshots: Snapshot[], accounts: HistoryAccount[]) {
	const byAccount = new Map<string, Snapshot[]>();
	for (const snapshot of [...snapshots].sort((a, b) => a.date.localeCompare(b.date))) {
		byAccount.set(snapshot.bankAccountId, [
			...(byAccount.get(snapshot.bankAccountId) ?? []),
			snapshot,
		]);
	}

	return (date: string): RoleTotals | null => {
		const totals: RoleTotals = { cash: 0, card: 0, savings: 0, loan: 0 };
		let isKnown = false;
		for (const account of accounts) {
			const latest = latestOnOrBefore(byAccount.get(account.id) ?? [], date);
			if (!latest) continue;
			isKnown = true;
			totals[account.role] += Math.round(latest.balance * account.rate);
		}
		return isKnown ? totals : null;
	};
}

function latestOnOrBefore(snapshots: Snapshot[], date: string) {
	let found: Snapshot | null = null;
	for (const snapshot of snapshots) {
		if (snapshot.date > date) break;
		found = snapshot;
	}
	return found;
}
