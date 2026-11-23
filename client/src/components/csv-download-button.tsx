import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
		<Button variant="outline" type="button" disabled={isDownloading} onClick={start}>
			<Download aria-hidden className="size-4" />
			{label}
		</Button>
	);
}
