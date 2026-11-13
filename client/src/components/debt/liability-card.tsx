import { ArrowDown, ArrowUp, ChevronRight, GripVertical } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Progress } from "@/components/ui/progress";
import { formatPercentShare, monthName, PAYMENT_RULE_OPTIONS } from "@/lib/debt";
import { formatMoney } from "@/lib/format";
import type { DebtLiability } from "@/types";

type Props = {
	liability: DebtLiability;
	currency: string;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMove: (delta: -1 | 1) => void;
	onOpen: () => void;
};

function ruleLabel(liability: DebtLiability) {
	const rule = liability.account.card?.paymentRule;
	return PAYMENT_RULE_OPTIONS.find((option) => option.value === rule)?.label ?? null;
}

/** One liability in the Debt plan; the handle drags it, the arrows move it by keyboard. */
export function LiabilityCard({
	liability,
	currency,
	canMoveUp,
	canMoveDown,
	onMove,
	onOpen,
}: Props) {
	const { account } = liability;
	const native = account.isoCurrencyCode;
	const statement = account.card?.latestStatement ?? null;
	const apr = account.aprBps === null ? "Add APR" : `APR ${account.aprBps / 100}%`;
	return (
		<div className="flex items-stretch gap-2 rounded-xl border border-border bg-card">
			<span aria-hidden className="flex cursor-grab items-center pl-2 text-muted-foreground">
				<GripVertical className="size-4" />
			</span>
			<button
				type="button"
				onClick={onOpen}
				className="flex flex-1 flex-col gap-1 py-3 text-left text-sm transition-colors hover:text-foreground/80"
			>
				<span className="flex flex-wrap items-baseline gap-x-2">
					<span className="font-medium">{account.name}</span>
					<Amount>{formatMoney(account.currentBalance, native)}</Amount>
					<span className="text-muted-foreground">
						· {formatPercentShare(liability.share)} of debt
					</span>
				</span>
				{account.creditLimit && account.card?.utilization !== null ? (
					<Progress
						value={Math.min(100, (account.card?.utilization ?? 0) * 100)}
						aria-label={`${account.name} utilization`}
					/>
				) : null}
				{statement ? (
					<span className="text-muted-foreground">
						Statement {formatMoney(statement.statementBalance, native)}
						{statement.minimumPayment !== null
							? ` · min ${formatMoney(statement.minimumPayment, native)}`
							: ""}
						{statement.dueDate ? ` · due ${statement.dueDate}` : ""}
					</span>
				) : null}
				<span className="text-muted-foreground">
					{apr}
					{ruleLabel(liability) ? ` · Pay: ${ruleLabel(liability)}` : ""} · this month{" "}
					{formatMoney(liability.scheduledPayment, currency)} +{" "}
					{formatMoney(liability.payback, currency)}
				</span>
				<span className="text-muted-foreground">
					Interest next period {formatMoney(liability.projectedInterest, currency)} ·{" "}
					{liability.payoffMonth
						? `paid off ${monthName(liability.payoffMonth)}`
						: "not paid off in 2 years"}
				</span>
			</button>
			<div className="flex flex-col justify-center gap-1 pr-2">
				{canMoveUp ? (
					<button
						type="button"
						aria-label={`Move ${account.name} up`}
						onClick={() => onMove(-1)}
						className="rounded-md p-1 transition-colors hover:bg-foreground/5"
					>
						<ArrowUp aria-hidden className="size-4" />
					</button>
				) : null}
				{canMoveDown ? (
					<button
						type="button"
						aria-label={`Move ${account.name} down`}
						onClick={() => onMove(1)}
						className="rounded-md p-1 transition-colors hover:bg-foreground/5"
					>
						<ArrowDown aria-hidden className="size-4" />
					</button>
				) : null}
				{!canMoveUp && !canMoveDown ? (
					<ChevronRight aria-hidden className="size-4 text-muted-foreground" />
				) : null}
			</div>
		</div>
	);
}
