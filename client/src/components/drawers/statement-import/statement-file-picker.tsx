import { type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
	isPending: boolean;
	onPick: (file: File) => void;
};

/** A hidden file input behind a button; the drawer reads the picked file. */
export function StatementFilePicker({ isPending, onPick }: Props) {
	const input = useRef<HTMLInputElement>(null);

	function onChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (file) onPick(file);
	}

	return (
		<div className="flex items-center gap-2">
			<input
				ref={input}
				type="file"
				accept=".ofx,.qfx,.qbo"
				aria-label="Statement file"
				className="sr-only"
				onChange={onChange}
			/>
			<Button
				type="button"
				variant="outline"
				disabled={isPending}
				onClick={() => input.current?.click()}
			>
				{isPending ? "Reading…" : "Choose file"}
			</Button>
			<span className="text-xs text-muted-foreground">OFX, QFX, or QBO, up to 1 MB</span>
		</div>
	);
}
