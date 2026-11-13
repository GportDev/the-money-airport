export type DebtStrategy = "avalanche" | "snowball" | "custom";

export type OrderableLiability = {
	id: string;
	balance: number;
	aprBps: number | null;
	priority: number | null;
};

const byBalance = (a: OrderableLiability, b: OrderableLiability) => a.balance - b.balance;

/** CONTEXT Debt plan: avalanche = highest APR first, snowball = lowest balance, custom = drag order. */
export function debtOrder(liabilities: OrderableLiability[], strategy: DebtStrategy) {
	const sorted = [...liabilities].sort((a, b) => {
		if (strategy === "snowball") return byBalance(a, b);
		if (strategy === "custom") {
			return (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER);
		}
		return (b.aprBps ?? -1) - (a.aprBps ?? -1) || byBalance(a, b);
	});
	return sorted.map((liability) => liability.id);
}
