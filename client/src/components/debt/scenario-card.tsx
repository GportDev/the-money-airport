import { cva } from "class-variance-authority";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { AmortizationScenario } from "@/types";

const card = cva("flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm", {
	variants: {
		isChosen: { true: "border-border bg-primary/5", false: "border-border bg-card" },
	},
});

type Props = {
	scenario: AmortizationScenario;
	currency: string;
	isChosen: boolean;
	isBusy: boolean;
	onUse: () => void;
};

export function ScenarioCard({ scenario, currency, isChosen, isBusy, onUse }: Props) {
	const label = `+${formatMoney(scenario.extra, currency)}`;
	return (
		<div className={card({ isChosen })}>
			<Amount className="font-medium">{label}</Amount>
			<Amount>{formatMoney(scenario.payment, currency)}/mo</Amount>
			<p className="text-muted-foreground">
				{scenario.payoffMonths} months
				{scenario.monthsSaved > 0 ? ` · ${scenario.monthsSaved} saved` : ""}
			</p>
			<p className="text-muted-foreground">
				Interest <Amount>{formatMoney(scenario.totalInterest, currency)}</Amount>
				{scenario.interestSaved > 0 ? (
					<>
						{" "}
						· saves <Amount>{formatMoney(scenario.interestSaved, currency)}</Amount>
					</>
				) : null}
			</p>
			<Button
				variant="outline"
				size="sm"
				type="button"
				aria-label={`Use ${label}`}
				disabled={isChosen || isBusy}
				onClick={onUse}
				className="mt-1"
			>
				{isChosen ? "In use" : "Use this"}
			</Button>
		</div>
	);
}
