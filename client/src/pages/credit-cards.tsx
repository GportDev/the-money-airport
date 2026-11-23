import { CreditCard as CreditCardIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { BenefitsPanel } from "@/components/credit-cards/benefits-panel";
import { BillingPeriod } from "@/components/credit-cards/billing-period";
import { CreditCardTile } from "@/components/credit-cards/credit-card-tile";
import { CreditCardsSkeleton } from "@/components/credit-cards/credit-cards-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { useCreditCards } from "@/hooks/use-credit-cards";

const CARD_PARAM = "card";

export function CreditCardsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const creditCards = useCreditCards();
	const cards = creditCards.data;
	const selected = cards?.find((card) => card.id === searchParams.get(CARD_PARAM)) ?? cards?.[0];

	function selectCard(id: string) {
		setSearchParams((current) => {
			const params = new URLSearchParams(current);
			params.set(CARD_PARAM, id);
			return params;
		});
	}

	function content() {
		if (creditCards.isError) {
			return (
				<QueryError
					message="Could not load credit cards."
					isRetrying={creditCards.isFetching}
					onRetry={() => void creditCards.refetch()}
				/>
			);
		}
		if (!cards) return <CreditCardsSkeleton />;
		if (!selected) {
			return (
				<EmptyState
					icon={CreditCardIcon}
					title="No credit cards yet"
					description="Connect a card or add one by hand in Accounts to track its rewards here."
					action={
						<Link
							to="/accounts"
							className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
						>
							Go to Accounts
						</Link>
					}
				/>
			);
		}
		return (
			<div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
				<ul aria-label="Credit cards" className="flex flex-col gap-3">
					{cards.map((card) => (
						<CreditCardTile
							key={card.id}
							card={card}
							isSelected={card.id === selected.id}
							onSelect={() => selectCard(card.id)}
						/>
					))}
				</ul>
				<div className="flex min-w-0 flex-col gap-4">
					<BenefitsPanel card={selected} />
					<BillingPeriod
						key={selected.id}
						accountId={selected.id}
						currency={selected.isoCurrencyCode}
					/>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageHeader title="Credit Cards" />
			{content()}
		</>
	);
}
