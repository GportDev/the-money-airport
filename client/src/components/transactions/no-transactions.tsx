import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type Props = { title: string; description: string; onAdd: () => void };

export function NoTransactions({ title, description, onAdd }: Props) {
	return (
		<EmptyState
			icon={ReceiptText}
			title={title}
			description={description}
			action={
				<button
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
					type="button"
					onClick={onAdd}
				>
					Add transaction
				</button>
			}
		/>
	);
}
