import { Upload } from "lucide-react";
import { useState } from "react";
import { StatementImportDrawer } from "@/components/drawers/statement-import-drawer";
import { Button } from "@/components/ui/button";

type Props = {
	accountId: string;
	currency: string;
};

/** Opens the Statement import drawer for a manual card. */
export function ImportStatementButton({ accountId, currency }: Props) {
	const [isOpen, setOpen] = useState(false);
	return (
		<>
			<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
				<Upload aria-hidden className="size-3.5" />
				Import statement
			</Button>
			{isOpen ? (
				<StatementImportDrawer
					accountId={accountId}
					currency={currency}
					onClose={() => setOpen(false)}
				/>
			) : null}
		</>
	);
}
