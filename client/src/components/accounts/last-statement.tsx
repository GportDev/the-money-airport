import { Amount } from "@/components/ui/amount";
import { daysUntil } from "@/lib/debt";
import { formatLongDate, formatMoney, todayIso } from "@/lib/format";
import type { CardStatement } from "@/types";

type Props = {
	statement: CardStatement;
	currency: string;
};

function dueText(dueDate: string) {
	const days = daysUntil(dueDate, todayIso());
	if (days === 0) return "due today";
	return days > 0 ? `due in ${days} days` : `was due ${-days} days ago`;
}

export function LastStatement({ statement, currency }: Props) {
	return (
		<section
			aria-label="Last statement"
			className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-sm"
		>
			<p className="text-xs text-muted-foreground">
				Last statement · closed {formatLongDate(statement.periodEnd)}
			</p>
			<p className="flex flex-wrap items-baseline gap-x-2">
				<Amount className="text-base font-semibold">
					{formatMoney(statement.statementBalance, currency)}
				</Amount>
				{statement.minimumPayment !== null ? (
					<span className="text-muted-foreground">
						min {formatMoney(statement.minimumPayment, currency)}
					</span>
				) : null}
			</p>
			{statement.dueDate ? (
				<p className="text-muted-foreground">
					Due {formatLongDate(statement.dueDate)} ({dueText(statement.dueDate)})
				</p>
			) : null}
		</section>
	);
}
