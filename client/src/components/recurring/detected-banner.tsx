import { toast } from "sonner";
import { MerchantLogo } from "@/components/transactions/merchant-logo";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { useCreateRecurring } from "@/hooks/use-recurring";
import { formatMoney } from "@/lib/format";
import { cadenceLabel } from "@/lib/recurring";
import type { RecurringCandidate } from "@/types";

type Props = { candidates: RecurringCandidate[] };

/**
 * Patterns found in history. Dismiss stores the item inactive so detection stops suggesting it,
 * and it can be switched back on from its drawer.
 */
export function DetectedBanner({ candidates }: Props) {
	const create = useCreateRecurring();
	if (candidates.length === 0) return null;

	async function onTrack(candidate: RecurringCandidate, isActive: boolean) {
		try {
			await create.mutateAsync({
				merchantName: candidate.merchantName,
				amount: candidate.amount,
				cadence: candidate.cadence,
				nextDate: candidate.nextDate,
				bankAccountId: candidate.account?.id ?? null,
				categoryId: candidate.categoryId,
				isActive,
				isManual: false,
			});
			toast.success(
				isActive ? `${candidate.merchantName} added` : `${candidate.merchantName} dismissed`,
			);
		} catch (_error) {
			toast.error(`Could not save ${candidate.merchantName}`);
		}
	}

	const count = candidates.length;
	return (
		<section
			aria-labelledby="recurring-detected-heading"
			className="rounded-xl border border-border bg-primary/5"
		>
			<div className="px-3 py-3">
				<h2 id="recurring-detected-heading" className="text-sm font-medium">
					Found {count} recurring {count === 1 ? "charge" : "charges"}
				</h2>
				<p className="text-xs text-muted-foreground">From your Transaction history.</p>
			</div>
			<ul className="divide-y divide-border border-t border-border">
				{candidates.map((candidate) => (
					<li
						key={`${candidate.merchantName}-${candidate.account?.id ?? "none"}`}
						className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
					>
						<MerchantLogo name={candidate.merchantName} url={candidate.merchantLogoUrl} />
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate font-medium">{candidate.merchantName}</span>
							<span className="text-xs text-muted-foreground">
								{cadenceLabel(candidate.cadence)}
							</span>
						</span>
						<Amount>{formatMoney(candidate.amount, candidate.isoCurrencyCode)}</Amount>
						<span className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								type="button"
								disabled={create.isPending}
								onClick={() => void onTrack(candidate, false)}
								aria-label={`Dismiss ${candidate.merchantName}`}
							>
								Dismiss
							</Button>
							<Button
								size="sm"
								type="button"
								disabled={create.isPending}
								onClick={() => void onTrack(candidate, true)}
								aria-label={`Add ${candidate.merchantName}`}
							>
								Add
							</Button>
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
