import { useState } from "react";
import { ApiError } from "@/api/client";
import { StatementFilePicker } from "@/components/drawers/statement-import/statement-file-picker";
import { StatementImportReview } from "@/components/drawers/statement-import/statement-import-review";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	useSheetClose,
} from "@/components/ui/sheet";
import { usePreviewStatementImport } from "@/hooks/use-statement-import";
import type { StatementImportPreview } from "@/types";

const MAX_FILE_BYTES = 1024 * 1024;

type Props = {
	accountId: string;
	currency: string;
	onClose: () => void;
};

type Picked = { text: string; preview: StatementImportPreview };

/** Import a closed Statement's OFX/QFX/QBO file into a manual card, after a preview. */
export function StatementImportDrawer({ accountId, currency, onClose }: Props) {
	const { sheet, close } = useSheetClose(onClose);
	const preview = usePreviewStatementImport();
	const [picked, setPicked] = useState<Picked | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onPick(file: File) {
		setPicked(null);
		setError(null);
		if (file.size > MAX_FILE_BYTES) {
			setError("The file is over 1 MB");
			return;
		}
		try {
			const text = await file.text();
			setPicked({ text, preview: await preview.mutateAsync({ accountId, file: text }) });
		} catch (caught) {
			setError(
				caught instanceof ApiError && caught.apiMessage
					? caught.apiMessage
					: "Could not read the file",
			);
		}
	}

	return (
		<Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader className="pr-12">
					<SheetTitle>Import statement</SheetTitle>
					<SheetDescription>
						A closed statement's file from the card's website confirms what you entered.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-2 px-4">
					<StatementFilePicker isPending={preview.isPending} onPick={(file) => void onPick(file)} />
					{error ? (
						<p role="alert" className="text-sm text-negative">
							{error}
						</p>
					) : null}
				</div>
				{picked ? (
					<StatementImportReview
						accountId={accountId}
						file={picked.text}
						preview={picked.preview}
						currency={currency}
						onDone={() => close()}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
