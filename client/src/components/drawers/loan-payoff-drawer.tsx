import { useState } from "react";
import { toast } from "sonner";
import { AmortizationChart } from "@/components/debt/amortization-chart";
import { AmortizationYearList } from "@/components/debt/amortization-year-list";
import { ScenarioCard } from "@/components/debt/scenario-card";
import { SummaryStat } from "@/components/forecast/summary-stat";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { useAmortization, useSetLoanTerms } from "@/hooks/use-liabilities";
import { monthName } from "@/lib/debt";
import { majorUnitsToCents } from "@/lib/format";
import type { BankAccount } from "@/types";

type Props = {
	account: BankAccount;
	onClose: () => void;
};

/** Base payment, extra-payment compare cards, and the schedule (PRD F12.24). */
export function LoanPayoffDrawer({ account, onClose }: Props) {
	const { sheet } = useSheetClose(onClose);
	const [custom, setCustom] = useState("");
	const [compareExtra, setCompareExtra] = useState<number | undefined>(undefined);
	const amortization = useAmortization(account.id, compareExtra);
	const setTerms = useSetLoanTerms();
	const currency = account.isoCurrencyCode;
	const chosen = account.loan?.extraPayment ?? 0;
	const data = amortization.data;

	async function onUse(extra: number) {
		try {
			await setTerms.mutateAsync({ accountId: account.id, extraPayment: extra });
			toast.success("Extra payment set");
		} catch (_error) {
			toast.error("Could not set the extra payment");
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{account.name} payoff</SheetTitle>
					<SheetDescription>
						Pay more each month to finish sooner and pay less interest.
					</SheetDescription>
				</SheetHeader>
				{amortization.isError ? (
					<p role="alert" className="px-4 text-sm text-negative">
						Add APR and term in the account drawer to see a payoff.
					</p>
				) : !data ? (
					<p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
				) : (
					<div className="flex flex-col gap-4 px-4 pb-6">
						<dl className="grid grid-cols-3 gap-2">
							<SummaryStat label="Payment" cents={data.basePayment} currency={currency} />
							<SummaryStat
								label="Total interest"
								cents={data.baseTotalInterest}
								currency={currency}
							/>
							<div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
								<dt className="text-xs text-muted-foreground">Payoff</dt>
								<dd className="text-lg font-semibold">
									{monthName(data.basePayoffDate.slice(0, 7))}
								</dd>
							</div>
						</dl>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{data.scenarios.map((scenario) => (
								<ScenarioCard
									key={scenario.extra}
									scenario={scenario}
									currency={currency}
									isChosen={scenario.extra === chosen}
									isBusy={setTerms.isPending}
									onUse={() => void onUse(scenario.extra)}
								/>
							))}
						</div>
						<form
							className="flex items-end gap-2 text-sm"
							onSubmit={(event) => {
								event.preventDefault();
								const cents = majorUnitsToCents(custom);
								if (Number.isFinite(cents) && cents >= 0) setCompareExtra(cents);
							}}
						>
							<label className="flex flex-1 flex-col gap-1" htmlFor="payoff-custom">
								Custom extra
								<input
									id="payoff-custom"
									className="rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
									type="number"
									inputMode="decimal"
									min="0"
									step="0.01"
									value={custom}
									onChange={(event) => setCustom(event.target.value)}
								/>
							</label>
							<button
								type="submit"
								className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-foreground/5"
							>
								Compare
							</button>
						</form>
						<AmortizationChart schedule={data.schedule} currency={currency} />
						<AmortizationYearList schedule={data.schedule} currency={currency} />
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
