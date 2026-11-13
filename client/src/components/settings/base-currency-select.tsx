import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useUpdateBaseCurrency } from "@/hooks/use-settings";
import { BASE_CURRENCIES } from "@/lib/constants";

export function BaseCurrencySelect({ value }: { value: string }) {
	const update = useUpdateBaseCurrency();

	function onChange(next: string) {
		update.mutate(next, {
			onSuccess: () => toast.success(`Base currency set to ${next}`),
			onError: () => toast.error("Could not change the base currency"),
		});
	}

	return (
		<div className="flex max-w-sm flex-col gap-1 text-sm">
			<label htmlFor="base-currency">Base currency</label>
			<Select value={value} onValueChange={onChange} disabled={update.isPending}>
				<SelectTrigger id="base-currency" className="w-40">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{BASE_CURRENCIES.map((code) => (
						<SelectItem key={code} value={code}>
							{code}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
