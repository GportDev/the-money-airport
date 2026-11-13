import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DebtChart } from "@/components/debt/debt-chart";
import { DebtHero } from "@/components/debt/debt-hero";
import { DebtPlanList } from "@/components/debt/debt-plan-list";
import { NotInPlan } from "@/components/debt/not-in-plan";
import { PlanControls } from "@/components/debt/plan-controls";
import { LoanPayoffDrawer } from "@/components/drawers/loan-payoff-drawer";
import { useDebtPlan, useReorderDebt } from "@/hooks/use-forecast";
import { useSettings } from "@/hooks/use-settings";
import type { DebtLiability } from "@/types";

export function DebtView() {
	const plan = useDebtPlan();
	const settings = useSettings();
	const reorder = useReorderDebt();
	const navigate = useNavigate();
	const [payoffId, setPayoffId] = useState<string | null>(null);
	const payoffAccount = plan.data?.liabilities.find(
		(entry) => entry.account.id === payoffId,
	)?.account;

	async function onReorder(ids: string[]) {
		try {
			await reorder.mutateAsync(ids);
			toast.success("Debt plan order saved");
		} catch (_error) {
			toast.error("Could not reorder the debt plan");
		}
	}

	function onOpen(liability: DebtLiability) {
		if (liability.account.displayGroup === "loan") setPayoffId(liability.account.id);
		else navigate("/accounts");
	}

	if (plan.isError) {
		return (
			<p role="alert" className="text-sm text-negative">
				Could not load the debt plan.
			</p>
		);
	}
	if (!plan.data) {
		return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
	}
	return (
		<div className="flex flex-col gap-4">
			<DebtHero plan={plan.data} />
			{settings.data ? (
				<PlanControls
					key={`${settings.data.safetyBuffer}-${settings.data.debtStrategy}`}
					settings={settings.data}
				/>
			) : null}
			<div className="rounded-xl border border-border bg-card p-4">
				<DebtChart plan={plan.data} />
			</div>
			<DebtPlanList
				liabilities={plan.data.liabilities}
				currency={plan.data.baseCurrency}
				onReorder={(ids) => void onReorder(ids)}
				onOpen={onOpen}
			/>
			<NotInPlan accounts={plan.data.notInPlan} />
			{payoffAccount ? (
				<LoanPayoffDrawer
					key={payoffAccount.id}
					account={payoffAccount}
					onClose={() => setPayoffId(null)}
				/>
			) : null}
		</div>
	);
}
