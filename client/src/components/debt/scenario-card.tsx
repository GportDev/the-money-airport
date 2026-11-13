import { cva } from "class-variance-authority";
import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";
import type { AmortizationScenario } from "@/types";

const card = cva("flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm", {
	variants: {
		isChosen: { true: "border-primary bg-primary/5", false: "border-border bg-card" },
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
			<p className="font-medium">{label}</p>
			<Amount>{formatMoney(scenario.payment, currency)}/mo</Amount>
			<p className="text-muted-foreground">
				{scenario.payoffMonths} months
				{scenario.monthsSaved > 0 ? ` · ${scenario.monthsSaved} saved` : ""}
			</p>
			<p className="text-muted-foreground">
				Interest {formatMoney(scenario.totalInterest, currency)}
				{scenario.interestSaved > 0
					? ` · saves ${formatMoney(scenario.interestSaved, currency)}`
					: ""}
			</p>
			<button
				type="button"
				aria-label={`Use ${label}`}
				disabled={isChosen || isBusy}
				onClick={onUse}
				className="mt-1 rounded-md border border-border px-2 py-1 transition-colors hover:bg-foreground/5 disabled:opacity-60"
			>
				{isChosen ? "In use" : "Use this"}
			</button>
		</div>
	);
}
