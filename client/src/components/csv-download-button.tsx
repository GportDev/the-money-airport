import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = { label: string; download: () => Promise<void> };

export function CsvDownloadButton({ label, download }: Props) {
	const [isDownloading, setDownloading] = useState(false);

	function start() {
		setDownloading(true);
		toast
			.promise(download(), {
				loading: "Preparing CSV…",
				success: "CSV downloaded",
				error: "Could not download the CSV",
			})
			.unwrap()
			.catch(() => undefined)
			.finally(() => setDownloading(false));
	}

	return (
		<button
			type="button"
			disabled={isDownloading}
			onClick={start}
			className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
		>
			<Download aria-hidden className="size-4" />
			{label}
		</button>
	);
}
