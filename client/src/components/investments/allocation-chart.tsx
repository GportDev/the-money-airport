import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Amount } from "@/components/ui/amount";
import { seriesColor } from "@/lib/chart";
import { formatMoney } from "@/lib/format";
import type { Investments } from "@/types";

type Props = { allocation: Investments["allocation"]; total: number; currency: string };

function share(value: number, total: number) {
	return total === 0 ? 0 : Math.round((value / total) * 100);
}

export function AllocationChart({ allocation, total, currency }: Props) {
	return (
		<section
			aria-labelledby="allocation-heading"
			className="rounded-xl border border-border bg-card p-6"
		>
			<h2 id="allocation-heading" className="text-sm font-medium text-muted-foreground">
				Allocation
			</h2>
			<figure
				aria-label="Allocation by account"
				className="mt-3 grid items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]"
			>
				<div className="mx-auto size-40">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={allocation}
								dataKey="value"
								nameKey="name"
								innerRadius="60%"
								outerRadius="100%"
								paddingAngle={1}
								isAnimationActive={false}
							>
								{allocation.map((row, index) => (
									<Cell key={row.accountId} fill={seriesColor(index)} />
								))}
							</Pie>
							<Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
						</PieChart>
					</ResponsiveContainer>
				</div>
				<figcaption>
					<ul className="flex flex-col gap-1.5 text-sm">
						{allocation.map((row, index) => (
							<li key={row.accountId} className="flex items-center gap-2">
								<span
									aria-hidden
									className="size-2 rounded-sm"
									// Slice ink is picked per account, so it cannot be a static class.
									style={{ backgroundColor: seriesColor(index) }}
								/>
								<span className="min-w-0 flex-1 truncate">{row.name}</span>
								<span className="text-xs text-muted-foreground">{share(row.value, total)}%</span>
								<Amount className="w-28 text-right">{formatMoney(row.value, currency)}</Amount>
							</li>
						))}
					</ul>
				</figcaption>
			</figure>
		</section>
	);
}
