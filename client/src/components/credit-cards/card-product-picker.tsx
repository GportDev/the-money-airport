import { useId } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/ui/query-error";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCardPresets, useRemoveCardProduct, useSetCardProduct } from "@/hooks/use-credit-cards";
import type { CreditCard } from "@/types";

const NO_PRODUCT = "none";
/** Card benefits entered through the API match no preset; they show under their own name. */
const CUSTOM_PRODUCT = "custom";

function selectedValue(benefits: CreditCard["benefits"]) {
	if (!benefits) return NO_PRODUCT;
	return benefits.presetKey ?? CUSTOM_PRODUCT;
}

/** Picks the card's Card product from the presets; the choice saves straight away. */
export function CardProductPicker({ card }: { card: CreditCard }) {
	const triggerId = useId();
	const presets = useCardPresets();
	const setProduct = useSetCardProduct();
	const removeProduct = useRemoveCardProduct();
	const value = selectedValue(card.benefits);
	const isSaving = setProduct.isPending || removeProduct.isPending;

	function onChange(next: string) {
		if (next === value || next === CUSTOM_PRODUCT) return;
		if (next === NO_PRODUCT) {
			removeProduct.mutate(card.id, {
				onSuccess: () => toast.success("Card product removed"),
				onError: () => toast.error("Could not remove the Card product"),
			});
			return;
		}
		setProduct.mutate(
			{ accountId: card.id, presetKey: next },
			{
				onSuccess: (benefits) => toast.success(`Card product set to ${benefits.productName}`),
				onError: () => toast.error("Could not set the Card product"),
			},
		);
	}

	if (presets.isError) {
		return (
			<QueryError
				message="Could not load Card products."
				isRetrying={presets.isFetching}
				onRetry={() => void presets.refetch()}
			/>
		);
	}
	return (
		<div className="flex max-w-sm flex-col gap-1">
			<label htmlFor={triggerId} className="text-xs text-muted-foreground">
				Card product
			</label>
			<Select value={value} onValueChange={onChange} disabled={isSaving || presets.isPending}>
				<SelectTrigger id={triggerId} aria-busy={isSaving}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NO_PRODUCT}>No card product</SelectItem>
					{value === CUSTOM_PRODUCT ? (
						<SelectItem value={CUSTOM_PRODUCT}>{card.benefits?.productName}</SelectItem>
					) : null}
					{presets.data?.map((preset) => (
						<SelectItem key={preset.key} value={preset.key}>
							{`${preset.issuer} · ${preset.productName}`}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
