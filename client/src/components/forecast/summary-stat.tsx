import { Amount } from "@/components/ui/amount";
import { formatMoney } from "@/lib/format";

type Props = {
	label: string;
	cents: number;
	currency: string;
	hint?: string;
};

export function SummaryStat({ label, cents, currency, hint }: Props) {
	return (
		<div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="text-lg font-semibold">
				<Amount>{formatMoney(cents, currency)}</Amount>
			</dd>
			{hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
		</div>
	);
}
