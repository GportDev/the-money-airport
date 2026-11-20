import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { title: string; description: string; onAdd: () => void };

export function NoTransactions({ title, description, onAdd }: Props) {
	return (
		<EmptyState
			icon={ReceiptText}
			title={title}
			description={description}
			action={
				<Button type="button" onClick={onAdd}>
					Add transaction
				</Button>
			}
		/>
	);
}
