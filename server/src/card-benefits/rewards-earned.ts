import { periodBounds } from "./calendar-periods";
import type {
	CardBenefitsInput,
	EarnRule,
	RewardsPeriod,
	RuleEarnings,
} from "./card-benefits.types";
import { bestRule, estimatedValue, type RewardTransaction, unitsFor } from "./earn-rules";

const BASE_RATE_LABEL = "Everything else";

type Line = Pick<RuleEarnings, "label" | "ratePer100" | "spend">;

/**
 * Rewards earned from `from` through `to`. `transactions` are one card's non-Transfer
 * Transactions since January 1 in date order, so a cap counts from its period's start.
 */
export function rewardsEarned(
	benefits: CardBenefitsInput,
	transactions: RewardTransaction[],
	from: string,
	to: string,
): RewardsPeriod {
	const base: Line = { label: BASE_RATE_LABEL, ratePer100: benefits.baseRatePer100, spend: 0 };
	const ruleLines = new Map<EarnRule, Line>(
		benefits.earnRules.map((rule) => [rule, { ...ruleLine(rule), spend: 0 }]),
	);
	const spendUnderCap = capTracker();
	for (const tx of transactions) {
		const spend = -tx.amount;
		const rule = bestRule(benefits.earnRules, tx);
		const atRuleRate = rule ? spendUnderCap(rule, tx.date, spend) : 0;
		if (tx.date < from || tx.date > to) continue;
		const line = rule && ruleLines.get(rule);
		if (line) line.spend += atRuleRate;
		base.spend += spend - atRuleRate;
	}
	return periodTotals([...ruleLines.values(), base], benefits.unitValue, from, to);
}

function ruleLine(rule: EarnRule) {
	return { label: rule.label, ratePer100: rule.ratePer100 };
}

/** Answers how much of a Transaction's spend earns the rule rate, using up the rule's cap. */
function capTracker() {
	const spentByRule = new Map<EarnRule, Map<string, number>>();
	return (rule: EarnRule, date: string, spend: number) => {
		const isRefund = spend <= 0;
		if (!rule.cap || isRefund) return spend;
		const period = periodBounds(date, rule.cap.period).start;
		const spentByPeriod = spentByRule.get(rule) ?? new Map<string, number>();
		const spent = spentByPeriod.get(period) ?? 0;
		const underCap = Math.min(spend, Math.max(0, rule.cap.amount - spent));
		spentByPeriod.set(period, spent + underCap);
		spentByRule.set(rule, spentByPeriod);
		return underCap;
	};
}

function periodTotals(lines: Line[], unitValue: number, from: string, to: string): RewardsPeriod {
	const byRule = lines
		.filter((line) => line.spend !== 0)
		.map((line) => earnings(line, unitValue))
		.sort((a, b) => b.value - a.value);
	return {
		from,
		to,
		spend: total(byRule, "spend"),
		units: total(byRule, "units"),
		value: total(byRule, "value"),
		byRule,
	};
}

function earnings(line: Line, unitValue: number): RuleEarnings {
	const units = unitsFor(line.spend, line.ratePer100);
	return { ...line, units, value: estimatedValue(units, unitValue) };
}

function total(lines: RuleEarnings[], field: "spend" | "units" | "value") {
	return lines.reduce((sum, line) => sum + line[field], 0);
}
